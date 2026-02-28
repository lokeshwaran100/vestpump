import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://yechpgwatchdtnigkqtw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4Hm8fICMdKh_gsAohqA8TA_WdPJ6UMa";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Row type matching the token_launches table
export type TokenLaunch = {
  id: number;
  created_at: string;
  chain_id: number;
  token_name: string;
  token_symbol: string;
  token_address: string;
  sale_address: string;
  vault_address: string;
  oracle_address: string | null;
  bootstrapper_address: string | null;
};

/** Insert a newly launched token into Supabase */
export async function saveTokenLaunch(row: Omit<TokenLaunch, "id" | "created_at">) {
  const { error } = await supabase.from("token_launches").insert(row);
  if (error) console.error("Supabase insert error:", error);
}

/** Fetch all token launches for a given chain, newest first */
export async function fetchTokenLaunches(chainId: number): Promise<TokenLaunch[]> {
  const { data, error } = await supabase
    .from("token_launches")
    .select("*")
    .eq("chain_id", chainId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase fetch error:", error);
    return [];
  }
  return (data ?? []) as TokenLaunch[];
}

/** Fetch the single most-recently launched token for a given chain */
export async function fetchLatestTokenLaunch(chainId: number): Promise<TokenLaunch | null> {
  const { data, error } = await supabase
    .from("token_launches")
    .select("*")
    .eq("chain_id", chainId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code !== "PGRST116") console.error("Supabase fetch error:", error); // PGRST116 = no rows
    return null;
  }
  return data as TokenLaunch;
}
