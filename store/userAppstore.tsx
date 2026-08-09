import {create} from 'zustand'
export type PendingAuthAction = "save-meal"|"saved-page"|"add-to-cart"| null;
type AppStore = {
    PendingAuthAction : PendingAuthAction;
    setPendingAuthAction :(action :PendingAuthAction)=> void;
    clearPendingAuthAction :() =>void

}
export const useAppstore =  create <AppStore> ((set)=>({
    PendingAuthAction:null,
    setPendingAuthAction:(action)=>set({PendingAuthAction:action}),
    clearPendingAuthAction : ()=> set({PendingAuthAction:null})
}))
