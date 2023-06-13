import type { EpisodeType, SeasonType, User } from "../types/series";
import { nanoid } from "nanoid";

import { read, utils } from "xlsx";
import {
  episodesStore,
  seasonsStore,
  selectedEpisode,
  selectedSeason,
} from "./store";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

interface LoadOptions {
  sheetNames?: {
    episodes?: string;
    seasons?: string;
  };
  filename?: string;
  debug?: boolean;
}

function extractImageSrc(src: string, basePath = "/", imgPath = "preview-img") {
  if (src.startsWith("https")) {
    return src;
  }

  return `${basePath}/${imgPath}/${src}`;
}

function extractSeasons(data: any, basePath: string = "/") {
  const seasonsResult: SeasonType[] = [];

  for (let season of data) {
    const previewUrl = extractImageSrc(season.preview_img_url, basePath);

    seasonsResult.push({
      id: season.id_temporada,
      title: season.titulo,
      description: season.descripcion,
      seasonNumber: season.numero ?? 0,
      previewUrl,
    });
  }

  return seasonsResult;
}

function extractpendingRelease(pending: string) {
  if (["si", "yes", "true", "verdadero"].includes(pending.toLowerCase()))
    return true;
  else if (["no", "false", "falso"].includes(pending.toLowerCase()))
    return false;

  return true;
}

function extractEpisodes(data: any, basePath: string = "/") {
  const episodesResult: EpisodeType[] = [];

  for (let episode of data) {
    let videoUrl = String(episode.video_url);

    if (!videoUrl.startsWith("https"))
      videoUrl = `${basePath}/${episode.video_url}`;

    const previewUrl = extractImageSrc(episode.preview_img_url, basePath);
    const portraitUrl = extractImageSrc(episode.portada, basePath);

    const pendingRelease = extractpendingRelease(episode.proximamente);

    episodesResult.push({
      id: episode.id_episodio,
      title: episode.titulo_episodio,
      seasonId: episode.id_temporada,
      episodeNumber: episode.numero,
      description: episode.descripcion,
      year: +episode.año,
      duration: episode.duracion,
      videoUrl,
      previewUrl,
      portraitUrl,
      pendingRelease,
      quizzUrl: episode.quizz_url,
      releaseDate: episode.fecha_estreno,
      releaseHour: episode.hora_estreno ?? "12",
      releaseMinute: episode.minuto_estreno ?? "00",
    });
  }

  return episodesResult;
}

export async function loadSeriesData(
  options: LoadOptions = {
    sheetNames: {
      episodes: "episodios",
      seasons: "temporadas",
    },
    filename: "datos-onconceptos.xlsx",
  }
) {
  let basePath;

  if (import.meta.env.BASE_URL == "/" && import.meta.env.DEV)
    basePath = "http://localhost:3000";
  else basePath = import.meta.env.BASE_URL;

  const file = await (
    await fetch(`${basePath}/${options.filename}`)
  ).arrayBuffer();
  const wb = read(file);

  const seasonsWB = wb.Sheets[options.sheetNames.seasons];
  const seasonsJson = utils.sheet_to_json(seasonsWB);
  const seasons = extractSeasons(seasonsJson, basePath);

  const episodesWB = wb.Sheets[options.sheetNames.episodes];
  const episodesJson = utils.sheet_to_json(episodesWB);
  const episodes = extractEpisodes(episodesJson, basePath);

  const data = {
    episodes,
    seasons,
  };

  return data;
}

const keyNames = {
  selectedEpisode: "selected-episode",
  selectedSeason: "selected-season",
};

function saveOnLocalStorage(key: string, object: any) {
  localStorage.setItem(key, JSON.stringify(object));
}

function loadFromLocalStorage(key: string) {
  const item = localStorage.getItem(key);

  return item ? JSON.parse(item) : null;
}

export async function saveData() {
  let season: SeasonType | null;
  selectedSeason.subscribe((s) => {
    season = s;
  });

  let episode: EpisodeType | null;
  selectedEpisode.subscribe((e) => {
    episode = e;
  });

  saveOnLocalStorage(keyNames.selectedEpisode, episode);
  saveOnLocalStorage(keyNames.selectedSeason, season);
}

function deleteLocalData() {
  saveOnLocalStorage(keyNames.selectedEpisode, null);
  saveOnLocalStorage(keyNames.selectedSeason, null);
}

export async function loadSavedData() {
  const episode: EpisodeType | null = loadFromLocalStorage(
    keyNames.selectedEpisode
  );
  const season: SeasonType | null = loadFromLocalStorage(
    keyNames.selectedSeason
  );

  let firstEpisode: EpisodeType;
  episodesStore.subscribe((episodes) => {
    firstEpisode = episodes[0];
  });

  let firstSeason: SeasonType;
  seasonsStore.subscribe((seasons) => {
    firstSeason = seasons[0];
  });

  selectedEpisode.set(episode || firstEpisode);
  selectedSeason.set(season || firstSeason);

  saveData();
}

function extractValueFromString(inputString: string, startTag: string, endTag) {
  const startIndex = inputString.indexOf(startTag);
  const endIndex = inputString.indexOf(endTag);

  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    return null; // No valid email found
  }

  const email = inputString.substring(startIndex + startTag.length, endIndex);
  return email;
}

async function getSiteContextDigest(): Promise<string> {
  const url: string = import.meta.env.VITE_MSD_BASE_URL;
  const basePath: string = import.meta.env.VITE_MSD_BASE_PATH;

  try {
    const contextResult = await fetch(`${url}/${basePath}/_api/contextinfo`, {
      method: "POST",
      headers: {
        Accept: "application/json;odata=verbose",
      },
    });

    const contextJson = await contextResult.json();

    return contextJson.d.GetContextWebInformation.FormDigestValue;
  } catch (err) {
    console.log("error getting site context", err);

    return "";
  }
}

export async function registerUserVisit(user: User) {
  const url: string = import.meta.env.VITE_MSD_BASE_URL;
  const basePath: string = import.meta.env.VITE_MSD_BASE_PATH;
  // const visitListName = import.meta.env.VITE_MSD_SP_VISITS_LIST_NAME;
  const visitListTitle = import.meta.env.VITE_MSD_SP_VISITS_LIST_TITLE;

  const userInfo = await getCurrentUser();

  try {
    const contextDigest = await getSiteContextDigest();

    const body = {
      // "__metadata": {
      //   type: visitListName
      // },
      Title: nanoid(),
      Correo: userInfo.email,
      Nombre: user.name,
      OData__x00da_ltimavisita: dayjs()
        .tz("America/Mexico_City")
        .subtract(2, "hour")
        .toISOString(),
      Departamento: user.department,
    };

    const bodyLength = JSON.stringify(body).length.toString();

    const res = await fetch(
      `${url}${basePath}/_api/web/lists/GetByTitle('${visitListTitle}')/items`,
      {
        method: "POST",
        headers: {
          Accept: "application/json;odata=verbose",
          "Content-Length": bodyLength,
          "X-RequestDigest": contextDigest,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const resJson = await res.json();

    console.log(resJson);
  } catch (err) {
    console.log("error registering user visit", err);
  }
}

function getElementsFromArray(arr: any[], fields: string[]) {
  let resultObject: Record<string, string> = {};

  for (let element of arr) {
    if (!fields.includes(element.Key)) continue;

    resultObject[element.Key] = element.Value;
  }

  return resultObject;
}

async function _getCompanyUser(): Promise<User | null> {
  try {
    const url: string = import.meta.env.VITE_MSD_BASE_URL;
    const res = await fetch(
      `${url}/_api/SP.UserProfiles.PeopleManager/GetMyProperties`,
      {
        headers: {
          Accept: "application/json;odata=verbose",
        },
      }
    );

    const resJson = await res.json();

    const keys = [
      "PreferredName",
      "WorkEmail",
      "UserProfile_GUID",
      "Department",
    ];
    const values = getElementsFromArray(
      resJson.d.UserProfileProperties.results,
      keys
    );

    const email = values.WorkEmail;
    const id = values.UserProfile_GUID;
    const nameId = values.UserProfile_GUID;
    const name = values.PreferredName;
    const department = values.Department;

    return {
      email,
      id,
      nameId,
      name,
      department,
    };
  } catch (err) {
    console.log(`get user info error: ${err}`);

    return defaultUser;
  }
}

export async function getCurrentUser() {
  const isDev = import.meta.env.DEV;

  if (isDev) return defaultUser;

  return await _getCompanyUser();
}

export const defaultUser: User = {
  email: "someone@somewhere.com",
  id: "000000",
  nameId: "0000000000000000",
  name: "Test",
  department: "",
};

const MSD_VERSION_KEY = "msd-version";

export function verifyInstalledVersion() {
  const savedVersion = loadFromLocalStorage(MSD_VERSION_KEY);
  const servedVersion = import.meta.env.VITE_MSD_VERSION;

  console.log(
    `served version: ${servedVersion} | saved version: ${savedVersion}`
  );

  if (!savedVersion || savedVersion === "undefined") {
    saveOnLocalStorage(MSD_VERSION_KEY, servedVersion);
  } else if (savedVersion !== servedVersion) {
    saveOnLocalStorage(MSD_VERSION_KEY, servedVersion);

    deleteLocalData();

    window.location.reload();
  }
}

export function getDate(date: string) {
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  console.log("is safari", isSafari);

  if (isSafari) return date.replaceAll("-", "/");
  else return date;
}
