import { Ionicons } from "@expo/vector-icons"
import { Tabs } from "expo-router"


export default function TabLayout(){
   return (
   <Tabs screenOptions={{
    headerShown:false,
    tabBarActiveTintColor:'#f97316',
    tabBarInactiveTintColor:"#6b7280",
    tabBarStyle:{
    backgroundColor:"#ffffff",
    borderTopColor:"#f3e7d8"
    }
   }}>


<Tabs.Screen 
name="index"
options={{
    title:"Discover",
    tabBarIcon :({color,size})=>(
        <Ionicons name="compass-outline" size={size}  color={color}/>
    )
}}

/>
<Tabs.Screen 
name="saved"
options={{
    title:"Saved",
    tabBarIcon :({color,size})=>(
        <Ionicons name="heart-outline" size={size}  color={color}/>
    )
}}

/>
<Tabs.Screen 
name="profile"
options={{
    title:"Profile",
    tabBarIcon :({color,size})=>(
        <Ionicons name="person-outline" size={size} color={color} />
    )
}}

/>
   </Tabs> 


   )
}
