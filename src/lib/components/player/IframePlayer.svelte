<script lang="ts">
  import {
    episodesStore,
    isMobile,
    selectedEpisode,
    localeOffset,
  } from "../../store";
  import {
    getDate,
    registerEpisiodeButtonClickByUser,
    registerEpisodeVisitedByUser,
  } from "../../utils";

  import dayjs from "dayjs";
  import "dayjs/locale/es";
  import utc from "dayjs/plugin/utc";
  import timezone from "dayjs/plugin/timezone";
  import { onDestroy, onMount } from "svelte";
  import { fade } from "svelte/transition";

  dayjs.extend(utc);
  dayjs.extend(timezone);

  const DEFAULT_WIDTH = 600;
  const DEFAULT_HEIGHT = 350;

  const MOBILE_WITHD = 380;
  const MOBILE_HEIGHT = 200;

  let isEpisodeReleased: boolean;

  let episodeReleaseInterval: any;

  onMount(async () => {
    await registerEpisodeVisitedByUser(episode);

    episodeReleaseInterval = setInterval(() => {
      const now = dayjs()
        .tz("America/Mexico_City")
        // .utc()
        .subtract($localeOffset, "hours");

      isEpisodeReleased = now.isAfter(releaseDate);

      pendingRelease = !isEpisodeReleased;
    }, 1000);

    // iframe trick to register a click
    window.focus();

    window.addEventListener("blur", () => {
      setTimeout(async () => {
        if (document.activeElement.tagName === "IFRAME") {
          // message.textContent = "clicked " + Date.now();
          await registerEpisiodeButtonClickByUser(
            $selectedEpisode,
            "reproductor"
          );
          window.focus();
        }
      });
    });
  });

  onDestroy(() => {
    clearInterval(episodeReleaseInterval);

    window.removeEventListener("blur", () => {});
  });

  $: episode = $selectedEpisode || $episodesStore[0];
  $: registerEpisodeVisitedByUser(episode);

  $: src = $selectedEpisode.videoUrl;
  $: title = $selectedEpisode.title;
  $: width = $isMobile ? MOBILE_WITHD : DEFAULT_WIDTH;
  $: height = $isMobile ? MOBILE_HEIGHT : DEFAULT_HEIGHT;
  $: style = `
  background: no-repeat center/100% url('${episode.portraitUrl}'); background-size: cover;
  width: ${width}px;
  height: ${height}px;
  `;

  $: releaseDate = episode
    ? getDate(episode.releaseDate, episode.releaseHour, episode.releaseMinute)
    : null;
  $: isEpisodeReleased = dayjs()
    .tz("America/Mexico_City")
    .subtract($localeOffset, "hours")
    .isAfter(releaseDate.tz("America/Mexico_City"));
  $: pendingRelease = !isEpisodeReleased;
</script>

{#if episode.pendingRelease || pendingRelease}
  <div in:fade {style}><h2><i>PRÓXIMAMENTE</i></h2></div>
{:else}
  <iframe in:fade {title} {width} {height} {src} allowfullscreen />
{/if}

<style>
  div {
    border-radius: 5px;
    color: white;
    padding-left: 20px;
    filter: grayscale(100%);
  }

  iframe {
    border: none;
  }
</style>
