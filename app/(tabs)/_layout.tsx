import { Ionicons } from "@expo/vector-icons"
import { Tabs } from "expo-router"

export default function TabLayout() {
    return (
        <Tabs screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#f97316',
            tabBarInactiveTintColor: '#9ca3af',
            tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: '600',
                marginTop: 2,
            },
            tabBarStyle: {
                backgroundColor: "#ffffff",
                borderTopColor: "#f3e7d8",
                borderTopWidth: 1,
                height: 60,
                paddingBottom: 8,
                paddingTop: 6,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 8,
            }
        }}>

            <Tabs.Screen
                name="index"
                options={{
                    title: "Menu",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="restaurant-outline" size={24} color={color} />
                    )
                }}
            />
            <Tabs.Screen
                name="saved"
                options={{
                    title: "Saved",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="heart-outline" size={24} color={color} />
                    )
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    title: "Orders",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="receipt-outline" size={24} color={color} />
                    )
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person-outline" size={24} color={color} />
                    )
                }}
            />
        </Tabs>
    )
}
