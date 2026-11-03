/* Supabase Auth and private per-user application data. Content stays in static assets. */
(function (root) {
  "use strict";

  const SUPABASE_VERSION = "2.105.0";
  const authOptions = {
    experimental: { passkey: true },
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  };
  let client = null;
  let loading = null;

  const config = () => root.TANGO_SUPABASE_CONFIG || {};
  const configured = () => Boolean(config().url && config().publishableKey);

  async function init() {
    if (client) return client;
    if (!configured()) return null;
    if (!loading) {
      loading = import(`https://esm.sh/@supabase/supabase-js@${SUPABASE_VERSION}`)
        .then(({ createClient }) => {
          client = createClient(config().url, config().publishableKey, {
            auth: authOptions,
          });
          return client;
        })
        .catch((error) => {
          loading = null;
          throw error;
        });
    }
    return loading;
  }

  async function required() {
    const connection = await init();
    if (!connection) throw Error("Supabaseの接続設定が必要です。");
    return connection;
  }

  async function recordReviews(events) {
    const connection = await required();
    const { data, error } = await connection.rpc("lexora_record_reviews", {
      events,
    });
    if (error) throw error;
    return data;
  }

  async function activeModel() {
    const connection = await required();
    const { data, error } = await connection
      .from("learning_models")
      .select("artifact")
      .eq("active", true)
      .maybeSingle();
    if (error) throw error;
    return data?.artifact || null;
  }

  async function onAuth(callback) {
    const connection = await init();
    if (!connection) {
      callback(null);
      return;
    }
    connection.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => callback(session?.user || null), 0);
    });
  }

  async function signIn() {
    const connection = await required();
    const { data, error } = await connection.auth.signInWithPasskey();
    if (error) throw error;
    return data;
  }

  async function registerPasskey() {
    const connection = await required();
    const { data, error } = await connection.auth.registerPasskey();
    if (error) throw error;
    return data;
  }

  async function sendEmailCode(email, createUser = false) {
    const connection = await required();
    const { error } = await connection.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: createUser },
    });
    if (error) throw error;
  }

  async function verifyEmailCode(email, token) {
    const connection = await required();
    const { data, error } = await connection.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const connection = await required();
    const { error } = await connection.auth.signOut();
    if (error) throw error;
  }

  async function load(uid) {
    const connection = await required();
    const { data, error } = await connection
      .from("user_data")
      .select("state")
      .eq("user_id", uid)
      .maybeSingle();
    if (error) throw error;
    return data?.state || null;
  }

  async function save(uid, state) {
    const connection = await required();
    const { error } = await connection
      .from("user_data")
      .upsert({ user_id: uid, state }, { onConflict: "user_id" });
    if (error) throw error;
  }

  root.TangoCloud = {
    configured,
    init,
    recordReviews,
    activeModel,
    onAuth,
    signIn,
    registerPasskey,
    sendEmailCode,
    verifyEmailCode,
    signOut,
    load,
    save,
  };
})(window);
