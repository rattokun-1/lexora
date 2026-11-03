/* Supabase Auth + private per-user application data. Content stays in static assets. */
(function(root){
 let client=null,loading=null;
 const config=()=>root.TANGO_SUPABASE_CONFIG||{};
 const configured=()=>Boolean(config().url&&config().publishableKey);
 async function init(){if(client)return client;if(!configured())return null;if(!loading)loading=import('https://esm.sh/@supabase/supabase-js@2.105.0').then(({createClient})=>client=createClient(config().url,config().publishableKey,{auth:{experimental:{passkey:true},persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}})).catch(e=>{loading=null;throw e;});return loading;}
 async function required(){const c=await init();if(!c)throw Error('Supabaseの接続設定が必要です。');return c;}
 root.TangoCloud={configured,init,
  async onAuth(callback){const c=await init();if(!c){callback(null);return;}c.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>callback(session?.user||null),0);});},
  async signIn(){const c=await required();const {data,error}=await c.auth.signInWithPasskey();if(error)throw error;return data;},
  async registerPasskey(){const c=await required();const {data,error}=await c.auth.registerPasskey();if(error)throw error;return data;},
  async sendEmailCode(email,createUser=false){const c=await required();const {error}=await c.auth.signInWithOtp({email,options:{shouldCreateUser:createUser}});if(error)throw error;},
  async verifyEmailCode(email,token){const c=await required();const {data,error}=await c.auth.verifyOtp({email,token,type:'email'});if(error)throw error;return data;},
  async signOut(){const c=await required();const {error}=await c.auth.signOut();if(error)throw error;},
  async load(uid){const c=await required();const {data,error}=await c.from('user_data').select('state').eq('user_id',uid).maybeSingle();if(error)throw error;return data?.state||null;},
  async save(uid,state){const c=await required();const {error}=await c.from('user_data').upsert({user_id:uid,state},{onConflict:'user_id'});if(error)throw error;}
 };
})(window);
