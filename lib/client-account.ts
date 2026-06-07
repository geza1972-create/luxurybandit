"use client";

import { getStoredAuthSession } from "@/lib/supabase-auth-client";

const ACCOUNT_STORAGE_KEY = "shopcut-client-account-id";

const normalizeAccountId = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

export type ClientWorkspace = {
  accountId: string;
  creatorSlug?: string;
  projectSlug?: string;
  label: string;
  source: "url" | "env" | "stored" | "default";
};

const getUrlWorkspace = (): ClientWorkspace | null => {
  if (typeof window === "undefined") return null;

  const segments = window.location.pathname.split("/").filter(Boolean);
  const creatorSegment = segments[0] ?? "";
  if (!creatorSegment.startsWith("@")) return null;

  const creatorSlug = normalizeAccountId(creatorSegment.slice(1));
  if (!creatorSlug) return null;

  const projectSlug = normalizeAccountId(segments[1] ?? "");
  const accountId = projectSlug ? `creator-${creatorSlug}-${projectSlug}` : `creator-${creatorSlug}`;
  return {
    accountId,
    creatorSlug,
    projectSlug: projectSlug || undefined,
    label: projectSlug ? `@${creatorSlug} / ${projectSlug}` : `@${creatorSlug}`,
    source: "url"
  };
};

export function getClientWorkspace(): ClientWorkspace {
  const authSession = getStoredAuthSession();
  if (authSession?.user?.id) {
    const accountId = `user-${normalizeAccountId(authSession.user.id)}`;
    window.localStorage.setItem(ACCOUNT_STORAGE_KEY, accountId);
    return {
      accountId,
      label: authSession.user.email ? authSession.user.email : "Signed in account",
      source: "stored"
    };
  }

  const urlWorkspace = getUrlWorkspace();
  if (urlWorkspace) {
    window.localStorage.setItem(ACCOUNT_STORAGE_KEY, urlWorkspace.accountId);
    return urlWorkspace;
  }

  const configuredAccountId = normalizeAccountId(process.env.NEXT_PUBLIC_SHOPCUT_ACCOUNT_ID ?? "");
  if (configuredAccountId) {
    window.localStorage.setItem(ACCOUNT_STORAGE_KEY, configuredAccountId);
    return {
      accountId: configuredAccountId,
      label: configuredAccountId,
      source: "env"
    };
  }

  const existing = normalizeAccountId(window.localStorage.getItem(ACCOUNT_STORAGE_KEY) ?? "");
  if (existing) {
    return {
      accountId: existing,
      label: existing,
      source: "stored"
    };
  }

  const defaultAccountId = "shopcut-main";
  window.localStorage.setItem(ACCOUNT_STORAGE_KEY, defaultAccountId);
  return {
    accountId: defaultAccountId,
    label: "LuxuryBandit main",
    source: "default"
  };
}

export function getClientAccountId() {
  return getClientWorkspace().accountId;
}

export function getWorkspaceStorageKey(baseKey: string) {
  if (typeof window === "undefined") return baseKey;

  const workspaceKey = `${baseKey}-${getClientAccountId()}`;
  if (!window.localStorage.getItem(workspaceKey)) {
    const legacyValue = window.localStorage.getItem(baseKey);
    if (legacyValue) {
      try {
        window.localStorage.setItem(workspaceKey, legacyValue);
      } catch {
        return baseKey;
      }
    }
  }
  return workspaceKey;
}

export function getAccountStorageKey() {
  return ACCOUNT_STORAGE_KEY;
}
