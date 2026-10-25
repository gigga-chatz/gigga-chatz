import {initializeApp} from 'firebase/app';
import {initializeAuth,getReactNativePersistence} from 'firebase/auth';
import {initializeFirestore} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const cfg={apiKey:"AIzaSyCNyYyMOoJmYF5TWxe9ZY-YzpGAtETZh4Q",authDomain:"gigga-chatz.firebaseapp.com",projectId:"gigga-chatz",storageBucket:"gigga-chatz.firebasestorage.app",messagingSenderId:"747594520264",appId:"1:747594520264:web:d330d13e86eab9ce3b37fd"};

const app=initializeApp(cfg);
export const auth=initializeAuth(app,{persistence:getReactNativePersistence(AsyncStorage)});
export const db=initializeFirestore(app,{experimentalForceLongPolling:true});

export const CLOUD='w3aqoh7k',PRESET='giggachat';