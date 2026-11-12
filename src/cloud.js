/* Supabase Auth and private per-user application data. Content stays in static assets. */
(function (root) {
  "use strict";

  const SUPABASE_VERSION = "2.105.0";
  const authOptions = {
    experimental: { passkey: true },
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: root.localStorage,
    storageKey: "kotomia.supabase.auth",
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

  async function createLesson(limit = 10) {
    const connection = await required();
    const { data, error } = await connection.rpc("lexora_create_lesson", {
      requested_limit: limit,
    });
    if (error) throw error;
    return data;
  }

  async function answerLesson(lessonId, itemIndex, selectedChoice, answerText = null) {
    const connection = await required();
    const { data, error } = await connection.rpc("lexora_answer_lesson", {
      lesson_id: lessonId,
      item_number: itemIndex,
      selected_choice: selectedChoice,
      answer_text: answerText,
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
    const { data, error } = await connection.auth.getSession();
    if (error) throw error;
    callback(data.session?.user || null);
  }

  async function ready() {
    const connection = await init();
    if (!connection) return null;
    const { data, error } = await connection.auth.getSession();
    if (error) throw error;
    return data.session?.user || null;
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

  async function sendEmailLink(email, _name, createUser = true) {
    const connection = await required();
    const { error } = await connection.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: createUser,
      },
    });
    if (error) throw error;
  }

  async function updateUserName(name) {
    const connection = await required();
    const { data, error } = await connection.auth.updateUser({
      data: { display_name: name, user_id: name },
    });
    if (error) throw error;
    return data.user;
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
    createLesson,
    answerLesson,
    activeModel,
    onAuth,
    ready,
    signIn,
    registerPasskey,
    sendEmailCode,
    sendEmailLink,
    updateUserName,
    verifyEmailCode,
    signOut,
    load,
    save,
  };
})(window);
