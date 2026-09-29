'use client';
import {createContext,useContext,useState,useEffect} from 'react';
import {usePathname} from 'next/navigation';
const Context=createContext({page:null,setPage:()=>{}});
export function DynamicPageLocaleProvider({children}){const [page,setPage]=useState(null);return <Context.Provider value={{page,setPage}}>{children}</Context.Provider>;}
export function useDynamicPageLocale(){return useContext(Context).page;}
export function DynamicPageLocaleBridge({slugs}){const {setPage}=useContext(Context);const pathname=usePathname();useEffect(()=>{setPage({pathname,slugs});return ()=>setPage(null);},[pathname,slugs,setPage]);return null;}
