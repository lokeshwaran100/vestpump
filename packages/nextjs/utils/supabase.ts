// Supabase project details
const SUPABASE_URL = "https://yechpgwatchdtnigkqtw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4Hm8fICMdKh_gsAohqA8TA_WdPJ6UMa";

// Row type matching the token_launches table
export type TokenLaunch = {
  id: number;
  created_at: string;
  chain_id: number | null;
  token_name: string;
  token_symbol: string;
  token_address: string;
  sale_address: string;
  vault_address: string;
  oracle_address: string | null;
  bootstrapper_address: string | null;
};

/** Common headers for Supabase REST API */
const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

/** Insert a newly launched token into Supabase */
export async function saveTokenLaunch(row: Omit<TokenLaunch, "id" | "created_at">) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/token_launches`, {
      method: "POST",
      headers,
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("Supabase insert error:", res.status, err);
    } else {
      console.log("Supabase insert success");
    }
  } catch (e) {
    console.error("Supabase insert network error:", e);
  }
}

/** Fetch all token launches, newest first */
export async function fetchTokenLaunches(): Promise<TokenLaunch[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/token_launches?order=created_at.desc&select=*`, {
      headers,
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("Supabase fetchTokenLaunches error:", res.status, err);
      return [];
    }
    const data = await res.json();
    console.log("Supabase fetchTokenLaunches:", data?.length, "rows", data);
    return data as TokenLaunch[];
  } catch (e) {
    console.error("Supabase fetchTokenLaunches network error:", e);
    return [];
  }
}

/** Fetch the single most-recently launched token */
export async function fetchLatestTokenLaunch(): Promise<TokenLaunch | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/token_launches?order=created_at.desc&limit=1&select=*`, {
      headers,
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("Supabase fetchLatestTokenLaunch error:", res.status, err);
      return null;
    }
    const data = await res.json();
    console.log("Supabase fetchLatestTokenLaunch:", data?.[0]);
    return data?.[0] ?? null;
  } catch (e) {
    console.error("Supabase fetchLatestTokenLaunch network error:", e);
    return null;
  }
}
/** Fetch a specific token launch by its Supabase row ID */
export async function fetchTokenLaunchById(id: number): Promise<TokenLaunch | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/token_launches?id=eq.${id}&select=*`, {
      headers,
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("Supabase fetchTokenLaunchById error:", res.status, err);
      return null;
    }
    const data = await res.json();
    return data?.[0] ?? null;
  } catch (e) {
    console.error("Supabase fetchTokenLaunchById network error:", e);
    return null;
  }
}
