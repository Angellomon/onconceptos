<script lang="ts">
  import Interrogation from "../svg/Interrogation.svelte";

  import { selectedEpisode } from "../../store";
  import { registerEpisiodeButtonClickByUser } from "../../utils";
  import type { SeasonType } from "../../../types/series";

  let hover = false;
  export let season: SeasonType;
  export let seasonQuizz = false;

  let buttonTitle = " Quizz";

  if (seasonQuizz) buttonTitle = "Encuesta de Salida";

  function handleMouseOver() {
    return () => {
      hover = true;
    };
  }

  function handleMouseLeave() {
    return () => {
      hover = false;
    };
  }

  async function handleLinkClick() {
    if (seasonQuizz)
      await registerEpisiodeButtonClickByUser(
        $selectedEpisode,
        "quizz_temporada"
      );
    else await registerEpisiodeButtonClickByUser($selectedEpisode, "quizz");
  }

  $: quizzUrl = seasonQuizz ? season.quizzUrl : $selectedEpisode.quizzUrl;
</script>

<a href={quizzUrl} target="_blank" rel="noreferrer" on:click={handleLinkClick}>
  <button
    on:mouseover={handleMouseOver()}
    on:mouseleave={handleMouseLeave()}
    on:focus={() => {}}
    class="quizz"
    class:season-quizz={seasonQuizz}
  >
    {#if !seasonQuizz}
      <Interrogation {hover} />
    {/if}
    {buttonTitle}</button
  >
</a>

<style>
  button {
    cursor: pointer;

    background-color: white;
    border-radius: var(--btn-border-radius);
    border: none;

    padding: 10px 20px;
    width: 100%;

    font-size: 22px;

    padding-left: 45px;

    /* border-radius: 20px; */
    position: relative;
  }

  button.quizz {
    border: 2px solid white;
    border-radius: var(--btn-border-radius);

    padding: 5px 20px;
    padding-left: 40px;

    height: 50px;

    position: relative;

    background: var(--secondary-color);
    color: white;

    font-size: 18px;

    cursor: pointer;
  }

  button.season-quizz {
    padding-left: 20px;
  }
</style>
