import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";

export default function PartidoScreen(){
    const router = useRouter();
    const{liga,titulo,dia,hora,estado,donde}= useLocalSearchParams<{
        liga:string;
        titulo:string;
        dia:string;
        hora:string;
        estado:string;
        donde:string;
    }>();
    return(
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <Pressable onPress={()=>router.back()}>
                    <ThemedText>← Volver</ThemedText>
                </Pressable>
                <ThemedText type='code'>{liga}</ThemedText>
                <ThemedText type='title'>{titulo}</ThemedText>
                <ThemedText>{dia} · {hora}</ThemedText>
                {estado ? <ThemedText>{estado}</ThemedText>:null}
                {donde ? <ThemedText>Donde Verlo:{donde}</ThemedText>:null}
            </SafeAreaView>
        </ThemedView>
    );
}
const styles= StyleSheet.create({
    container:{
        flex : 1,
    },
    safeArea:{
        flex:1,
        paddingHorizontal:Spacing.four,
        gap:Spacing.three,
    },
});