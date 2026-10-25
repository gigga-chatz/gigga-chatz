import React,{useEffect,useState,useRef} from 'react';
import {View,Text,TextInput,TouchableOpacity,FlatList,ScrollView,Image,StyleSheet,Animated,Linking,KeyboardAvoidingView,StatusBar,ActivityIndicator,Alert,BackHandler} from 'react-native';
import {BlurView} from 'expo-blur';
import {LinearGradient} from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {useAudioRecorder,RecordingPresets,requestRecordingPermissionsAsync,setAudioModeAsync,useAudioPlayer,useAudioPlayerStatus} from 'expo-audio';
import {onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,updatePassword,EmailAuthProvider,reauthenticateWithCredential,deleteUser} from 'firebase/auth';
import {doc,setDoc,onSnapshot,collection,query,where,orderBy,addDoc,updateDoc,deleteDoc,getDocs,limit} from 'firebase/firestore';
import {auth,db,CLOUD,PRESET} from './firebase';

const ADMIN='jab@gigga.app',DOM='@gigga.app',LOGO=require('./assets/logo.png'),SKY=require('./assets/skyscale.png');
const TOP=(StatusBar.currentHeight||28)+6,COL=['#ef5a62','#7b1fa2','#1976d2','#f57c00','#00897b','#5d4037'];
const BAD=['admin','user','test','guest','anonymous','anon','hacker','root','demo','username','name','player','support','moderator','jab','none','null','unknown','fake','someone','nobody','abc','xyz','asdf','qwerty'];
const NAMEERR='Please create your account with your own real name (letters only, like “Priya Kumar”).';
const T=[{n:'Coral',b:'#ef5a62',t:'#fff'},{n:'Ocean',b:'#1976d2',t:'#fff'},{n:'Purple',b:'#7b1fa2',t:'#fff'},{n:'Green',b:'#2e7d32',t:'#fff'},{n:'Orange',b:'#f57c00',t:'#fff'},{n:'Teal',b:'#00897b',t:'#fff'},
{n:'Black & Gold',b:'#d4af37',t:'#000',bg:'#000'},{n:'Black & Neon',b:'#00e676',t:'#000',bg:'#000'},{n:'Black & Red',b:'#e53935',t:'#fff',bg:'#000'},{n:'Black & Cyan',b:'#00e5ff',t:'#000',bg:'#000'},{n:'Black & Pink',b:'#ff4f8b',t:'#fff',bg:'#000'},{n:'Black & White',b:'#fff',t:'#000',bg:'#000'}];
const keyOf=n=>n.toLowerCase().replace(/[^a-z]+/g,'.').replace(/^\.+|\.+$/g,'');
const cap=n=>n.trim().replace(/\s+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const okName=n=>{n=n.trim().replace(/\s+/g,' ');if(!/^[A-Za-z][A-Za-z .'-]{1,29}$/.test(n))return false;const l=n.toLowerCase();if(l.split(' ').some(w=>BAD.includes(w)))return false;return /[aeiouy]/.test(l)&&!/(.)\1{3,}/.test(l)};
const hm=t=>t?new Date(t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'';
const lab=m=>m.t||({image:'📷 Photo',video:'🎥 Video',file:'📎 File',audio:'🎤 Voice message'})[m.k];
async function upload(uri,path){
  const name=path.split('/').pop(),ext=(name.split('.').pop()||'').toLowerCase();
  const type={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',mp4:'video/mp4',mov:'video/quicktime',m4a:'audio/mp4',mp3:'audio/mpeg',pdf:'application/pdf'}[ext]||'application/octet-stream';
  const f=new FormData();f.append('file',{uri,name,type});f.append('upload_preset',PRESET);
  const r=await fetch('https://api.cloudinary.com/v1_1/'+CLOUD+'/auto/upload',{method:'POST',body:f}),j=await r.json();
  if(!j.secure_url)throw new Error('upload failed');return j.secure_url}
function useUser(id){const [u,setU]=useState();useEffect(()=>{if(!id||id==='admin')return;return onSnapshot(doc(db,'users',id),d=>d.exists()&&setU({id,...d.data()}))},[id]);return u}

/* ---------- glass UI ---------- */
const Glass=({style,children,r=24})=>(
  <View style={[{borderRadius:r,overflow:'hidden',borderWidth:1,borderColor:'rgba(255,255,255,.75)',backgroundColor:'rgba(255,255,255,.3)'},style]}>
    <BlurView intensity={45} tint="light" experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill}/>
    {children}
  </View>);
const Bg=({children})=>{
  const a=useRef(new Animated.Value(0)).current;
  useEffect(()=>{Animated.loop(Animated.sequence([Animated.timing(a,{toValue:1,duration:9000,useNativeDriver:true}),Animated.timing(a,{toValue:0,duration:9000,useNativeDriver:true})])).start()},[]);
  const mv=a.interpolate({inputRange:[0,1],outputRange:[0,50]}),nv=Animated.multiply(mv,-1);
  return (
    <LinearGradient colors={['#ffb199','#ffd7a6','#ff9fa8','#ffe2cc']} start={{x:0,y:0}} end={{x:1,y:1}} style={{flex:1}}>
      <Animated.View style={[s.blob,{top:-70,left:-70,backgroundColor:'#ff7a85',transform:[{translateX:mv},{translateY:mv}]}]}/>
      <Animated.View style={[s.blob,{bottom:-90,right:-70,backgroundColor:'#ffc16b',transform:[{translateX:nv},{translateY:nv}]}]}/>
      {children}
    </LinearGradient>);};
const Pw=({style})=><View style={[{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},style]}><Text style={s.sub}>Powered by</Text><Image source={SKY} style={{width:49,height:40}} resizeMode="contain"/></View>;
const Lk=({t,onPress,big})=><TouchableOpacity onPress={onPress} style={{padding:6}}><Text style={{color:'#ef5a62',fontWeight:'700',fontSize:big?26:15}}>{t}</Text></TouchableOpacity>;
const Row=({children})=><View style={{flexDirection:'row',gap:14,marginTop:4,alignItems:'center'}}>{children}</View>;
const Head=({title,left,right,onBack})=>(
  <Glass style={{margin:10,marginTop:TOP}}><View style={s.hr}>
    {onBack&&<Lk t="←" onPress={onBack}/>}{left}
    <View style={{flex:1}}>{typeof title==='string'?<Text style={s.name}>{title}</Text>:title}</View>{right}
  </View></Glass>);
const Item=({left,title,sub,onPress,right})=>(
  <TouchableOpacity onPress={onPress}><Glass r={22} style={{marginHorizontal:10,marginVertical:5}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:12,padding:12}}>{left}
      <View style={{flex:1}}>{typeof title==='string'?<Text style={s.name}>{title}</Text>:title}<Text numberOfLines={1} style={s.sub}>{sub}</Text></View>{right}
    </View></Glass></TouchableOpacity>);
function Av({id,size=44}){const u=useUser(id);
  if(id==='admin')return <Image source={LOGO} style={{width:size,height:size}} resizeMode="contain"/>;
  const st={width:size,height:size,borderRadius:size/2,borderWidth:2,borderColor:'#fff'};
  return u&&u.dp?<Image source={{uri:u.dp}} style={st}/>:<View style={[st,{backgroundColor:COL[((u&&u.name&&u.name.charCodeAt(0))||0)%COL.length],alignItems:'center',justifyContent:'center'}]}><Text style={{color:'#fff',fontWeight:'700',fontSize:size*.4}}>{(u&&u.name||'?')[0]}</Text></View>}
function Nm({id,style}){const u=useUser(id);return <Text style={style}>{id==='admin'?'Gigga Chatz Team':(u&&u.name)||'…'}</Text>}
const Kav=({children})=><KeyboardAvoidingView style={{flex:1}} behavior="padding">{children}</KeyboardAvoidingView>;

/* ---------- splash ---------- */
function Splash(){const a=useRef(new Animated.Value(0)).current;
  useEffect(()=>{Animated.loop(Animated.sequence([Animated.timing(a,{toValue:1,duration:700,useNativeDriver:true}),Animated.timing(a,{toValue:0,duration:700,useNativeDriver:true})])).start()},[]);
  return <Bg><View style={{flex:1,alignItems:'center',justifyContent:'center'}}>
    <Animated.Image source={LOGO} style={{width:130,height:130,transform:[{scale:a.interpolate({inputRange:[0,1],outputRange:[.92,1.08]})}]}}/>
    <Text style={s.wm}>Gigga Chatz</Text><ActivityIndicator color="#ef5a62" style={{marginTop:16}}/>
  </View><Pw style={{position:'absolute',bottom:34,left:0,right:0}}/></Bg>}

/* ---------- auth ---------- */
function Auth(){
  const [mode,setMode]=useState('signup'),[name,setName]=useState(''),[p,setP]=useState(''),[p2,setP2]=useState(''),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
  const go=async()=>{setErr('');const k=keyOf(name);
    try{
      if(k==='jab'){await signInWithEmailAndPassword(auth,ADMIN,p);return}
      if(mode==='signup'){
        if(!okName(name))return setErr(NAMEERR);
        if(p.length<6)return setErr('Password must be at least 6 characters');
        if(p!==p2)return setErr("Passwords don't match");
        setBusy(true);
        const c=await createUserWithEmailAndPassword(auth,k+DOM,p);
        await setDoc(doc(db,'users',c.user.uid),{name:cap(name),key:k,bio:'',dp:'',th:0,at:Date.now()});
      }else{setBusy(true);await signInWithEmailAndPassword(auth,k+DOM,p)}
    }catch(e){setErr(e.code==='auth/email-already-in-use'?'This name is already taken. Add your surname or initial, e.g. “Priya K”.':['auth/invalid-credential','auth/user-not-found','auth/wrong-password','auth/invalid-email'].includes(e.code)?'Wrong name or password':'Something went wrong. Try again.')}
    setBusy(false)};
  return <Bg><ScrollView contentContainerStyle={{flexGrow:1,justifyContent:'center',padding:16,paddingTop:TOP}} keyboardShouldPersistTaps="handled">
    <Glass r={34} style={{padding:24}}>
      <Image source={LOGO} style={{width:90,height:90,alignSelf:'center'}}/>
      <Text style={s.wm}>Gigga Chatz</Text><Text style={[s.sub,{textAlign:'center',marginBottom:16}]}>Chat with your friends</Text>
      <View style={{flexDirection:'row',marginBottom:14}}>{[['signup','Create account'],['login','Log in']].map(([k,l])=>
        <TouchableOpacity key={k} style={{flex:1,padding:10,borderBottomWidth:2,borderColor:mode===k?'#ef5a62':'transparent'}} onPress={()=>{setMode(k);setErr('')}}><Text style={{textAlign:'center',fontWeight:'700',color:mode===k?'#222':'#8a7a78'}}>{l}</Text></TouchableOpacity>)}</View>
      <TextInput style={s.f} placeholder={mode==='signup'?'Your real name':'Your name'} placeholderTextColor="#8a7a78" value={name} onChangeText={setName}/>
      <TextInput style={s.f} placeholder="Password" placeholderTextColor="#8a7a78" secureTextEntry value={p} onChangeText={setP}/>
      {mode==='signup'&&<TextInput style={s.f} placeholder="Confirm password" placeholderTextColor="#8a7a78" secureTextEntry value={p2} onChangeText={setP2}/>}
      <Text style={s.err}>{err}</Text>
      <TouchableOpacity style={s.btn} onPress={go} disabled={busy}><Text style={{color:'#fff',fontWeight:'800',fontSize:16}}>{busy?'Please wait…':mode==='signup'?'Sign up':'Log in'}</Text></TouchableOpacity>
      {mode==='signup'&&<Text style={[s.sub,{textAlign:'center',marginTop:14,fontSize:12}]}>Use your own name so friends can find you. By joining you agree that the admin can view and moderate chats to keep everyone safe.</Text>}
      <Pw style={{marginTop:16}}/>
    </Glass></ScrollView></Bg>}

function Gone(){return <Bg><View style={{flex:1,alignItems:'center',justifyContent:'center',padding:30}}><Text style={[s.name,{textAlign:'center'}]}>This account was removed by the admin.</Text><Lk t="Log out" onPress={()=>signOut(auth)}/></View></Bg>}

/* ---------- messages ---------- */
function Voice({url,color}){const p=useAudioPlayer({uri:url});const st=useAudioPlayerStatus(p);
  return <TouchableOpacity onPress={()=>{if(st.playing)p.pause();else{if(st.duration&&st.currentTime>=st.duration-.1)p.seekTo(0);p.play()}}}><Text style={{color,fontSize:16}}>{st.playing?'⏸':'▶'}  Voice message</Text></TouchableOpacity>}
function Bubble({m,mine,th}){
  const su=useUser(m.from),ot=!mine&&su&&typeof su.th==='number'?T[su.th]:null,bg=mine?th.b:(ot?ot.b:(th.bg?'#262626':'rgba(255,255,255,.78)')),fg=mine?th.t:(ot?ot.t:(th.bg?'#fff':'#222')),open=()=>Linking.openURL(m.u);
  return <View style={{alignSelf:mine?'flex-end':'flex-start',maxWidth:'82%'}}>
    <View style={{backgroundColor:bg,borderRadius:18,padding:10,borderWidth:1,borderColor:'rgba(255,255,255,.55)'}}>
      {m.rm?<Text style={{color:fg,fontStyle:'italic'}}>🚫 Removed by admin</Text>:<>
        {m.k==='image'&&<TouchableOpacity onPress={open}><Image source={{uri:m.u}} style={{width:220,height:220,borderRadius:12}}/></TouchableOpacity>}
        {m.k==='video'&&<TouchableOpacity onPress={open}><Text style={{color:fg}}>🎥 Video — tap to play</Text></TouchableOpacity>}
        {m.k==='file'&&<TouchableOpacity onPress={open}><Text style={{color:fg}}>📎 {m.n} ({Math.max(1,Math.round((m.z||0)/1024))} KB)</Text></TouchableOpacity>}
        {m.k==='audio'&&<Voice url={m.u} color={fg}/>}
        {!!m.t&&<Text style={{color:fg,fontSize:15,marginTop:m.k?4:0}}>{m.t}</Text>}<Text style={{color:fg,opacity:.6,fontSize:10,alignSelf:'flex-end',marginTop:2}}>{hm(m.ts)}</Text></>}
    </View>{m.ed&&<Text style={s.tag}>edited by admin</Text>}</View>}

function Composer({folder,onSend,accent,atx}){
  const [t,setT]=useState(''),[note,setNote]=useState(''),[recing,setRecing]=useState(false),rec=useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const up=async(uri,k,n,z)=>{if(z>10e6){setNote('Max file size is 10 MB');return}
    setNote('Sending…');try{const url=await upload(uri,`${folder}/${Date.now()}_${n.replace(/[^\w.\-]/g,'_')}`);await onSend({k,u:url,n,z,t:t.trim()});setT('');setNote('')}catch(e){setNote(e.message==='cancel'?'':'Could not send')}};
  const sendT=async()=>{const x=t.trim();if(!x)return;try{await onSend({t:x});setT('')}catch(e){}};
  const pickM=async()=>{const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images','videos'],quality:.7});if(r.canceled)return;const a=r.assets[0];up(a.uri,a.type==='video'?'video':'image',a.fileName||'media',a.fileSize||0)};
  const pickD=async()=>{const r=await DocumentPicker.getDocumentAsync({copyToCacheDirectory:true});if(r.canceled)return;const a=r.assets[0];up(a.uri,'file',a.name,a.size||0)};
  const mic=async()=>{
    if(!recing){const p=await requestRecordingPermissionsAsync();if(!p.granted){setNote('Microphone not allowed');return}
      await setAudioModeAsync({allowsRecording:true,playsInSilentMode:true});await rec.prepareToRecordAsync();rec.record();setRecing(true);setNote('Recording… tap ⏹ to send')}
    else{await rec.stop();setRecing(false);await setAudioModeAsync({allowsRecording:false});if(rec.uri)up(rec.uri,'audio','voice.m4a',0)}};
  const B=({ic,f})=><TouchableOpacity onPress={f}><Text style={{fontSize:22,padding:3}}>{ic}</Text></TouchableOpacity>;
  return <Glass r={30} style={{margin:10,marginBottom:16}}>
    {!!note&&<Text style={s.note}>{note}</Text>}
    <View style={{flexDirection:'row',alignItems:'center',padding:8,gap:4}}>
      <B ic="🖼" f={pickM}/><B ic="📎" f={pickD}/>
      <TextInput style={s.in} value={t} onChangeText={setT} placeholder="Message…" placeholderTextColor="#8a7a78" multiline/>
      <B ic={recing?'⏹':'🎤'} f={mic}/>
      <TouchableOpacity onPress={sendT} style={[s.send,accent&&{backgroundColor:accent}]}><Text style={{color:atx||'#fff',fontWeight:'700'}}>Send</Text></TouchableOpacity>
    </View></Glass>}

/* ---------- screens ---------- */
function Nav({go,cur}){return <Glass r={28} style={{margin:10,marginBottom:16}}><View style={{flexDirection:'row',justifyContent:'space-around',padding:8}}>
  {[['home','💬','Chats'],['profile','👤','Profile']].map(([k,i,l])=><TouchableOpacity key={k} onPress={()=>go(k)} style={{alignItems:'center',opacity:cur===k?1:.55}}><Text style={{fontSize:22}}>{i}</Text><Text style={{fontSize:12,fontWeight:'700',color:cur===k?'#ef5a62':'#6f5d5b'}}>{l}</Text></TouchableOpacity>)}
</View></Glass>}

function Home({me,go}){
  const [cs,setCs]=useState([]);
  useEffect(()=>onSnapshot(query(collection(db,'chats'),where('members','array-contains',me.id)),q=>setCs(q.docs.map(d=>({id:d.id,...d.data()})).filter(c=>c.last).sort((a,b)=>b.last.ts-a.last.ts))),[]);
  return <Bg>
    <Head title="Gigga Chatz" left={<Image source={LOGO} style={{width:34,height:34}}/>} right={<Lk t="＋" big onPress={()=>go('find')}/>}/>
    <ScrollView style={{flex:1}}>
      <Item onPress={()=>go('updates')} left={<Av id="admin" size={46}/>} title="Gigga Chatz Team" sub="Updates from the admin"/>
      {cs.map(c=>{const o=c.members.find(x=>x!==me.id);return <Item key={c.id} onPress={()=>go('chat',{id:c.id,other:o})} left={<Av id={o} size={46}/>} title={<Nm id={o} style={s.name}/>} sub={c.last.t} right={<Text style={s.tag}>{hm(c.last.ts)}</Text>}/>})}
      {!cs.length&&<Text style={[s.sub,{textAlign:'center',margin:30}]}>No chats yet. Tap ＋ and search a friend's name.</Text>}
    </ScrollView><Nav go={go} cur="home"/></Bg>}

function Find({me,go}){
  const [q,setQ]=useState(''),[rs,setRs]=useState([]);
  useEffect(()=>{const k=keyOf(q);if(!k){setRs([]);return}
    getDocs(query(collection(db,'users'),where('key','>=',k),where('key','<=',k+'\uf8ff'),limit(20))).then(x=>setRs(x.docs.filter(d=>d.id!==me.id).map(d=>({id:d.id,...d.data()}))))},[q]);
  const open=async u=>{const m=[me.id,u.id].sort(),id=m.join('_');await setDoc(doc(db,'chats',id),{members:m},{merge:true});go('chat',{id,other:u.id})};
  return <Bg><Head onBack={()=>go('home')} title="Find a friend"/>
    <TextInput style={[s.f,{marginHorizontal:10}]} placeholder="Search by name" placeholderTextColor="#8a7a78" value={q} onChangeText={setQ} autoFocus/>
    <ScrollView keyboardShouldPersistTaps="handled">{rs.map(u=><Item key={u.id} onPress={()=>open(u)} left={<Av id={u.id} size={42}/>} title={u.name} sub={u.bio||''}/>)}
      {!!q&&!rs.length&&<Text style={[s.sub,{textAlign:'center',margin:24}]}>No one found with that name.</Text>}</ScrollView></Bg>}

function Chat({me,go,id,other}){
  const [ms,setMs]=useState([]),ls=useRef(),th=T[me.th||0]||T[0];
  useEffect(()=>onSnapshot(query(collection(db,'chats',id,'messages'),orderBy('ts')),q=>setMs(q.docs.map(d=>({id:d.id,...d.data()})))),[id]);
  const send=async m=>{const ts=Date.now();await addDoc(collection(db,'chats',id,'messages'),{from:me.id,ts,...m});await updateDoc(doc(db,'chats',id),{last:{t:lab(m),ts}})};
  return <Bg><Kav>
    <Head onBack={()=>go('home')} left={<Av id={other} size={34}/>} title={<Nm id={other} style={s.name}/>}/>
    <View style={{flex:1,marginHorizontal:10,borderRadius:26,overflow:'hidden',backgroundColor:th.bg||(th.b+'22')}}>
      <FlatList ref={ls} data={ms} keyExtractor={m=>m.id} contentContainerStyle={{padding:10,gap:6}} onContentSizeChange={()=>ls.current&&ls.current.scrollToEnd()} renderItem={({item})=><Bubble m={item} mine={item.from===me.id} th={th}/>}/>
    </View>
    <Composer folder={`chats/${id}`} onSend={send} accent={th.b} atx={th.t}/></Kav></Bg>}

function Updates({go}){
  const [ups,setUps]=useState([]);
  useEffect(()=>onSnapshot(query(collection(db,'updates'),orderBy('ts')),q=>setUps(q.docs.map(d=>({id:d.id,...d.data()})))),[]);
  return <Bg><Head onBack={()=>go('home')} left={<Av id="admin" size={34}/>} title="Gigga Chatz Team"/>
    <FlatList style={{flex:1}} data={ups} keyExtractor={m=>m.id} contentContainerStyle={{padding:10,gap:6}} renderItem={({item})=><Bubble m={item} mine={false} th={T[0]}/>} ListEmptyComponent={<Text style={[s.sub,{textAlign:'center',margin:30}]}>No updates yet.</Text>}/>
    <Text style={[s.sub,{textAlign:'center',marginBottom:20}]}>Updates from the admin. You can't reply here.</Text></Bg>}

function Profile({me,go}){
  const [bio,setBio]=useState(me.bio||''),[pw,setPw]=useState(''),[msg,setMsg]=useState(''),[del,setDel]=useState(false),[dpw,setDpw]=useState(''),th0=T[me.th||0]||T[0];
  const U=p=>updateDoc(doc(db,'users',me.id),p);
  const delAcc=async()=>{try{
    await reauthenticateWithCredential(auth.currentUser,EmailAuthProvider.credential(auth.currentUser.email,dpw));
    const cs=await getDocs(query(collection(db,'chats'),where('members','array-contains',me.id)));
    for(const c of cs.docs){const ms=await getDocs(collection(db,'chats',c.id,'messages'));for(const m of ms.docs){if(m.data().from===me.id)await deleteDoc(m.ref)}await deleteDoc(c.ref)}
    await deleteDoc(doc(db,'users',me.id));await deleteUser(auth.currentUser);
  }catch(e){setMsg(['auth/invalid-credential','auth/wrong-password'].includes(e.code)?'Wrong password':'Could not delete. Try again.')}};
  const dp=async()=>{const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.6});if(r.canceled)return;
    setMsg('Uploading…');try{const url=await upload(r.assets[0].uri,`dp/${me.id}.jpg`);await U({dp:url});setMsg('Photo updated ✓')}catch(e){setMsg('Upload failed')}};
  const save=async()=>{try{await U({bio:bio.trim()});if(pw){if(pw.length<6)return setMsg('Password must be 6+ characters');await updatePassword(auth.currentUser,pw);setPw('')}setMsg('Saved ✓')}
    catch(e){setMsg(e.code==='auth/requires-recent-login'?'Log out and log in again to change your password':'Could not save')}};
  return <Bg><Head title="Profile" left={<Image source={LOGO} style={{width:34,height:34}}/>}/>
    <ScrollView style={{flex:1}} contentContainerStyle={{padding:10}} keyboardShouldPersistTaps="handled"><Glass r={28} style={{padding:20,alignItems:'center'}}>
      <TouchableOpacity onPress={dp}><Av id={me.id} size={96}/></TouchableOpacity>
      <Row><Lk t="Change photo" onPress={dp}/>{!!me.dp&&<Lk t="Remove" onPress={()=>U({dp:''})}/>}</Row>
      <Text style={[s.name,{fontSize:22,marginTop:6}]}>{me.name}</Text><Text style={[s.sub,{marginBottom:12}]}>Your name can’t be changed</Text>
      <TextInput style={[s.f,{alignSelf:'stretch'}]} placeholder="Bio" placeholderTextColor="#8a7a78" value={bio} onChangeText={setBio} maxLength={80}/>
      <TextInput style={[s.f,{alignSelf:'stretch'}]} placeholder="New password (leave empty to keep)" placeholderTextColor="#8a7a78" secureTextEntry value={pw} onChangeText={setPw}/>
      <Text style={s.sub}>Chat color</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,justifyContent:'center',marginVertical:10}}>{T.map((t,i)=>
        <TouchableOpacity key={i} onPress={()=>U({th:i})} style={{width:42,height:42,borderRadius:21,overflow:'hidden',borderWidth:3,borderColor:(me.th||0)===i?'#ef5a62':'#fff'}}>
          <LinearGradient colors={[t.bg||'#f2f2f2',t.bg||'#f2f2f2',t.b,t.b]} locations={[0,.5,.5,1]} start={{x:0,y:0}} end={{x:1,y:1}} style={{flex:1}}/></TouchableOpacity>)}</View>
      <View style={{alignSelf:'stretch',borderRadius:20,padding:10,gap:6,backgroundColor:th0.bg||(th0.b+'22')}}><Bubble m={{t:'Hey! 👋',ts:Date.now()}} mine={false} th={th0}/><Bubble m={{t:'This is your chat color',ts:Date.now()}} mine th={th0}/></View>
      <TouchableOpacity onPress={()=>setDel(!del)}><Text style={{color:'#d93025',fontWeight:'700',padding:10}}>Delete my account</Text></TouchableOpacity>
      {del&&<View style={{alignSelf:'stretch'}}><Text style={[s.sub,{marginBottom:6}]}>This permanently deletes your account, photo and chats.</Text><TextInput style={s.f} placeholder="Enter your password to confirm" placeholderTextColor="#8a7a78" secureTextEntry value={dpw} onChangeText={setDpw}/><TouchableOpacity style={[s.btn,{backgroundColor:'#d93025'}]} onPress={delAcc}><Text style={{color:'#fff',fontWeight:'800'}}>Delete forever</Text></TouchableOpacity></View>}
      <Text style={[s.sub,{color:'#188038',minHeight:18}]}>{msg}</Text>
      <TouchableOpacity style={[s.btn,{alignSelf:'stretch'}]} onPress={save}><Text style={{color:'#fff',fontWeight:'800'}}>Save</Text></TouchableOpacity>
      <TouchableOpacity style={{padding:14}} onPress={()=>signOut(auth)}><Text style={{color:'#ef5a62',fontWeight:'700'}}>Log out</Text></TouchableOpacity>
      <Text style={s.sub}>Gigga Chatz v1.0.0</Text><Pw style={{marginTop:12}}/>
    </Glass></ScrollView><Nav go={go} cur="profile"/></Bg>}

/* ---------- admin ---------- */
function Admin({go}){
  const [tab,setTab]=useState('chats'),[cs,setCs]=useState([]),[us,setUs]=useState([]),[ups,setUps]=useState([]);
  useEffect(()=>{
    const a=onSnapshot(collection(db,'chats'),q=>setCs(q.docs.map(d=>({id:d.id,...d.data()})).filter(c=>c.last).sort((x,y)=>y.last.ts-x.last.ts)));
    const b=onSnapshot(collection(db,'users'),q=>setUs(q.docs.map(d=>({id:d.id,...d.data()}))));
    const c=onSnapshot(query(collection(db,'updates'),orderBy('ts')),q=>setUps(q.docs.map(d=>({id:d.id,...d.data()}))));
    return()=>{a();b();c()}},[]);
  const sendAll=m=>new Promise((res,rej)=>Alert.alert('Send to everyone?','All users will get this update.',[
    {text:'Cancel',style:'cancel',onPress:()=>rej(new Error('cancel'))},
    {text:'Send',onPress:async()=>{await addDoc(collection(db,'updates'),{ts:Date.now(),...m});res()}}]));
  const rmUser=x=>Alert.alert('Remove '+x.name+'?','They will lose access to the app.',[{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:()=>deleteDoc(doc(db,'users',x.id))}]);
  return <Bg><Kav>
    <Head title="Admin panel" left={<Image source={LOGO} style={{width:34,height:34}}/>} right={<Lk t="Log out" onPress={()=>signOut(auth)}/>}/>
    <View style={{flexDirection:'row',gap:6,marginHorizontal:10,marginBottom:6}}>{[['chats','All chats'],['users','Users ('+us.length+')'],['up','📢 Updates']].map(([k,l])=>
      <TouchableOpacity key={k} style={{flex:1}} onPress={()=>setTab(k)}><Glass r={16} style={{padding:10,alignItems:'center',backgroundColor:tab===k?'rgba(255,255,255,.85)':undefined}}><Text style={{fontWeight:'700',color:tab===k?'#ef5a62':'#6f5d5b'}}>{l}</Text></Glass></TouchableOpacity>)}</View>
    {tab==='chats'&&<ScrollView style={{flex:1}}>{cs.map(c=><Item key={c.id} onPress={()=>go('adminchat',{id:c.id})} left={<Av id={c.members[0]} size={40}/>}
      title={<Text style={s.name}><Nm id={c.members[0]}/> ↔ <Nm id={c.members[1]}/></Text>} sub={c.last.t}/>)}
      {!cs.length&&<Text style={[s.sub,{textAlign:'center',margin:30}]}>No chats yet.</Text>}</ScrollView>}
    {tab==='users'&&<ScrollView style={{flex:1}}>{us.map(x=><Item key={x.id} onPress={()=>rmUser(x)} left={<Av id={x.id} size={40}/>} title={x.name} sub={'Login ID: '+x.name+' · joined '+new Date(x.at||0).toLocaleDateString()+' · tap to remove'}/>)}</ScrollView>}
    {tab==='up'&&<><FlatList style={{flex:1}} data={ups} keyExtractor={m=>m.id} contentContainerStyle={{padding:10,gap:6}} renderItem={({item})=><Bubble m={item} mine th={T[0]}/>}/>
      <Composer folder="updates" onSend={sendAll}/></>}
  </Kav></Bg>}

function AdminChat({go,id}){
  const [ms,setMs]=useState([]),[ei,setEi]=useState(null),[ev,setEv]=useState('');
  useEffect(()=>onSnapshot(query(collection(db,'chats',id,'messages'),orderBy('ts')),q=>setMs(q.docs.map(d=>({id:d.id,...d.data()})))),[id]);
  const P=m=>doc(db,'chats',id,'messages',m.id);
  return <Bg><Head onBack={()=>go('admin')} title="Chat (admin view)"/>
    <ScrollView style={{flex:1}} contentContainerStyle={{padding:10,gap:8}} keyboardShouldPersistTaps="handled">{ms.map(m=>
      <Glass key={m.id} r={18} style={{padding:10}}>
        <Nm id={m.from} style={s.tag}/><Bubble m={m} mine={false} th={T[0]}/>
        {ei===m.id?<><TextInput value={ev} onChangeText={setEv} style={[s.f,{marginTop:6}]}/><Row><Lk t="Save" onPress={async()=>{await updateDoc(P(m),{t:ev.trim(),ed:true});setEi(null)}}/><Lk t="Cancel" onPress={()=>setEi(null)}/></Row></>
        :!m.rm&&<Row>{!m.k&&<Lk t="Edit" onPress={()=>{setEv(m.t);setEi(m.id)}}/>}<Lk t="Delete" onPress={()=>updateDoc(P(m),{rm:true,t:'',u:'',k:''})}/></Row>}
      </Glass>)}</ScrollView></Bg>}

/* ---------- root ---------- */
export default function App(){
  const [ready,setReady]=useState(false),[u,setU]=useState(undefined),[me,setMe]=useState(null),[r,setR]=useState({n:'home'});
  useEffect(()=>{const t=setTimeout(()=>setReady(true),1800),un=onAuthStateChanged(auth,setU);return()=>{clearTimeout(t);un()}},[]);
  useEffect(()=>{setMe(null);if(!u)return;
    if(u.email===ADMIN){setMe({id:u.uid,admin:true});setR({n:'admin'});return}
    setR({n:'home'});return onSnapshot(doc(db,'users',u.uid),d=>setMe(d.exists()?{id:u.uid,...d.data()}:'gone'))},[u&&u.uid]);
  const go=(n,p={})=>setR({n,...p});
  useEffect(()=>{const h=BackHandler.addEventListener('hardwareBackPress',()=>{if(r.n==='home'||r.n==='admin')return false;go(me&&me.admin?'admin':'home');return true});return()=>h.remove()},[r.n,me]);
  if(!ready||u===undefined||(u&&!me))return <Splash/>;
  if(!u)return <Auth/>;
  if(me==='gone')return <Gone/>;
  const P={me,go};
  return r.n==='admin'?<Admin {...P}/>:r.n==='adminchat'?<AdminChat {...P} id={r.id}/>:r.n==='find'?<Find {...P}/>:r.n==='chat'?<Chat {...P} id={r.id} other={r.other}/>:r.n==='profile'?<Profile {...P}/>:r.n==='updates'?<Updates {...P}/>:<Home {...P}/>}

const s=StyleSheet.create({
  wm:{fontSize:30,fontWeight:'800',fontStyle:'italic',color:'#ef5a62',textAlign:'center',marginTop:6},
  in:{flex:1,minHeight:40,maxHeight:100,backgroundColor:'rgba(255,255,255,.6)',borderRadius:20,paddingHorizontal:14,color:'#222',borderWidth:1,borderColor:'rgba(255,255,255,.85)'},
  f:{backgroundColor:'rgba(255,255,255,.6)',borderRadius:14,padding:12,marginBottom:10,color:'#222',borderWidth:1,borderColor:'rgba(255,255,255,.85)'},
  send:{backgroundColor:'#ef5a62',borderRadius:20,paddingHorizontal:14,height:40,justifyContent:'center'},
  btn:{backgroundColor:'#ef5a62',borderRadius:18,padding:14,alignItems:'center'},
  tag:{fontSize:11,color:'#7a6866',marginTop:2},note:{textAlign:'center',color:'#7a6866',fontSize:12,paddingTop:8},
  err:{color:'#d93025',marginBottom:8,minHeight:18},blob:{position:'absolute',width:280,height:280,borderRadius:140,opacity:.45},
  name:{fontWeight:'700',fontSize:16,color:'#222'},sub:{color:'#7a6866',fontSize:13},
  hr:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:14,paddingVertical:10}
});
