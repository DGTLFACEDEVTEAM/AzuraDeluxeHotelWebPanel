'use client';
import {createContext,useContext,useState,useEffect} from 'react';
import {usePathname} from 'next/navigation';
const Context=createContext({page:null,setPage:()=>{}});
export function BlogLocaleProvider({children}){const [page,setPage]=useState(null);return <Context.Provider value={{page,setPage}}>{children}</Context.Provider>;}
export function useBlogLocale(){return useContext(Context).page;}
export function BlogLocaleBridge({slugs}){const {setPage}=useContext(Context);const pathname=usePathname();useEffect(()=>{setPage({pathname,slugs});return ()=>setPage(null);},[pathname,slugs,setPage]);return null;}
