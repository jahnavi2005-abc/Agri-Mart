import { createClient } from "@supabase/supabase-js";
import WebSocket from "isomorphic-ws";

let supabaseUrl = "https://placeholder.supabase.co";
let supabaseAnon = "placeholder";

if (typeof window !== "undefined") {
  try {
    const request = new XMLHttpRequest();
    // We use synchronous XHR (false parameter) to load config before app initializes.
    // This is required because supabase client is a singleton imported synchronously throughout the app.
    request.open("GET", "/api/config", false);
    request.send(null);

    if (request.status === 200) {
      const config = JSON.parse(request.responseText);
      if (config.supabaseUrl) supabaseUrl = config.supabaseUrl;
      if (config.supabaseAnonKey) supabaseAnon = config.supabaseAnonKey;
    } else {
      console.error("Failed to load configuration from backend");
    }
  } catch (error) {
    console.error("Error loading config:", error);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "agrimart-auth",
  },
  realtime: {
    transport: WebSocket,
  },
});
