/**
 * Media Reward Widget Logic
 * Handles Twitch reward redemption by playing associated media files.
 */
import StarOverlay, { TwitchRewardRedemptionEvent } from "@staroverlay/sdk";

let rewardQueue: any[] = [];
let isPlayingCount = 0;
let isQueueProcessing = false;

StarOverlay.on("ready", () => {
    console.log("[MediaReward] Widget Initialized");

    const twitchIntegration = StarOverlay.integrations.find(i => i.type === 'twitch');
    if (!twitchIntegration) {
        console.warn("[MediaReward] No Twitch integration found for this widget");
        return;
    }

    const eventId = "channel.channel_points_custom_reward_redemption.add";
    StarOverlay.subscribe<TwitchRewardRedemptionEvent>(twitchIntegration.id, eventId, (data) => {
        const fullRewardId = `${twitchIntegration.id}:${data.reward.id}`;
        console.log(`[MediaReward] Reward received: ${fullRewardId}`);
        processIncomingReward(fullRewardId);
    });
});

function processIncomingReward(rewardId: string) {
    const settings = StarOverlay.settings || {};
    const rewardsList = settings.rewards || [];

    const mapping = rewardsList.find((m: any) => m.reward === rewardId);
    if (!mapping || !mapping.media) return;

    const concurrency = settings.global?.concurrencyMode || "Queue";

    if (concurrency === "Only Once" && isPlayingCount > 0) {
        console.log("[MediaReward] Discarding concurrent reward (Only Once mode)");
        return;
    }

    if (concurrency === "Queue") {
        rewardQueue.push(mapping);
        processQueue();
    } else {
        playMedia(mapping);
    }
}

async function processQueue() {
    if (isQueueProcessing || rewardQueue.length === 0) return;
    isQueueProcessing = true;

    while (rewardQueue.length > 0) {
        const currentMapping = rewardQueue.shift();
        await playMedia(currentMapping);
    }

    isQueueProcessing = false;
}

/**
 * Downloads and renders media based on Content-Type
 */
async function playMedia(mapping: any) {
    const mediaUrl = StarOverlay.media(mapping.media);
    if (!mediaUrl) return;

    isPlayingCount++;

    let blobUrl: string | null = null;
    try {
        // Fetch to detect type accurately and cache in blob
        const response = await fetch(mediaUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const contentType = response.headers.get("Content-Type") || "";
        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);

        const isVideo = contentType.startsWith("video/");
        const isAudio = contentType.startsWith("audio/");

        await new Promise<void>((resolve) => {
            renderAsset({
                url: blobUrl as string,
                type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
                volume: (mapping.volume ?? 100) / 100,
                onComplete: () => {
                    if (blobUrl) URL.revokeObjectURL(blobUrl);
                    resolve();
                }
            });
        });

    } catch (e) {
        console.error("[MediaReward] Playback failure", e);
        if (blobUrl) URL.revokeObjectURL(blobUrl);
    } finally {
        isPlayingCount--;
    }
}

/**
 * DOM manipulation for asset rendering
 */
function renderAsset({ url, type, volume, onComplete }: { url: string, type: 'audio' | 'video' | 'image', volume: number, onComplete: () => void }) {
    const viewport = document.getElementById('media-viewport');
    if (!viewport) return;

    const settings = StarOverlay.settings || {};
    const isFillMode = settings.global?.displayMode === "Fill";
    const imgDuration = (settings.global?.imageDuration || 3) * 1000;

    let el: HTMLMediaElement | HTMLImageElement;

    if (type === 'audio') {
        el = new Audio(url);
        el.volume = volume;
        el.onended = onComplete;
        el.onerror = onComplete;
        el.play().catch(onComplete);
        return; // Audio doesn't need DOM/Fades for this app's logic
    }

    if (type === 'video') {
        el = document.createElement('video');
        el.src = url;
        el.autoplay = true;
        el.volume = volume;
        el.className = `media-reward-item ${isFillMode ? 'fill' : 'fit'}`;
        el.onended = () => cleanup(el, onComplete);
        el.onerror = () => cleanup(el, onComplete);
    } else {
        el = document.createElement('img');
        el.src = url;
        el.className = `media-reward-item ${isFillMode ? 'fill' : 'fit'}`;
        setTimeout(() => cleanup(el, onComplete), imgDuration);
    }

    viewport.appendChild(el);
    requestAnimationFrame(() => el.classList.add('active'));
}

function cleanup(element: HTMLElement, callback: () => void) {
    element.classList.remove('active');
    setTimeout(() => {
        element.remove();
        callback();
    }, 300);
}
