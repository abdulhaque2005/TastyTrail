import * as WebBrowser from 'expo-web-browser';
import { View, ActivityIndicator } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export default function SSOCallback() {
    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff8ef" }}>
            <ActivityIndicator size="large" color="#f97316" />
        </View>
    );
}