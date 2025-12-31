import { browser } from '$app/environment';

export const defaultBranches = [
  "staging-next",
  "master",
  "nixos-unstable-small",
  "nixpkgs-unstable",
  "nixos-unstable",
];

export function setToken(token: string) {
  if (browser) {
    localStorage.setItem("token", token);
  }
}

function getToken() {
  if (browser) {
    return localStorage.getItem("token");
  }
  return null;
}

export function hasToken(): boolean {
  return !!getToken();
}

function header() {
  const token = getToken();
  if (token) {
    return {
      Authorization: `token ${token}`,
    };
  }
}

export async function getAllBranches(): Promise<string[]> {
  const headers = header();
  try {
    const response = await fetch(
      "https://api.github.com/repos/NixOS/nixpkgs/git/matching-refs/heads/nixos-",
      { headers },
    );
    if (!response.ok) {
        console.error("Failed to fetch branches");
        return defaultBranches;
    }
    const data = await response.json();
    const nixosBranches = data
      .map((b: any) => b.ref.replace("refs/heads/", ""))
      .filter((name: string) => /^nixos-\d+\.\d+(-small)?$/.test(name))
      .sort((a: string, b: string) => b.localeCompare(a, undefined, { numeric: true }))
      .slice(0, 2); // Get top 2 latest stable branches

    // Merge and deduplicate
    return Array.from(new Set([...defaultBranches, ...nixosBranches]));
  } catch (e) {
    console.error("Error fetching branches:", e);
    return defaultBranches;
  }
}

export type PR = {
  title: string;
  status: number;
  closed: boolean;
  merged: boolean;
  base: string;
  merge_commit_sha: string;
};

export async function getPR(pr: string): Promise<PR> {
  const headers = header();
  const response = await fetch(
    `https://api.github.com/repos/nixos/nixpkgs/pulls/${pr}`,
    { headers },
  );

  const data = await response.json();

  return {
    title: data.title,
    status: response.status,
    closed: data.state === "closed" && !data.merged_at,
    merged: data.merged_at !== null,
    base: data.base?.ref,
    merge_commit_sha: data.merge_commit_sha,
  };
}

export async function isContain(
  branch: string,
  commit: string,
): Promise<boolean> {
  const headers = header();
  const url = `https://api.github.com/repos/nixos/nixpkgs/compare/${branch}...${commit}`;
  const response = await fetch(url, { headers });
  if (response.status === 404) {
    return false;
  }
  const data = await response.json();
  return data.status === "identical" || data.status === "behind";
}

export type History = {
  pr: number;
  title: string;
  mergeCommit: string;
};

export function getHistoryList(): History[] {
  if (!browser) return [];
  const history = localStorage.getItem("history");
  if (history) {
    return JSON.parse(history);
  }
  return [];
}

export function saveHistory(history: History) {
  if (!browser) return;
  const historyList = getHistoryList();
  // Check if it already exists to avoid duplicates
  if (!historyList.some(h => h.pr === history.pr)) {
      historyList.push(history);
      localStorage.setItem("history", JSON.stringify(historyList));
  }
}

export function getHistoryTitle(pr: number): string {
  const history = getHistoryList();
  const item = history.find((item) => item.pr === pr);
  if (item) {
    return item.title;
  }
  return "";
}

export function deleteHistory(pr: number) {
  if (!browser) return;
  const history = getHistoryList();
  const newHistory = history.filter((item) => item.pr !== pr);
  localStorage.setItem("history", JSON.stringify(newHistory));
}
