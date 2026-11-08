import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import * as Notifications from 'expo-notifications';

const COLORES: Record<string, string> = {
  NBA: '#E56020',
  NFL: '#1E5AA8',
  F1: '#E10600',
  Premier: '#2F855A',
  LaLiga: '#2F855A',
  Champions: '#2F855A',
  'Liga Betplay': '#2F855A',
};
const FONDOS: Record<string, string> = {
    NBA: '#3A1A0B',
    NFL: '#0B2545',
    F1: '#2B0000',
    Premier: '#0B3D24',
    LaLiga: '#0B3D24',
    Champions: '#0B3D24',
    'Liga Betplay': '#0B3D24',
}
Notifications.setNotificationHandler({
    handleNotification:async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});
export default function PartidoScreen() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const[avisoId,setAvisoId]=useState<string | null>(null);
  const avisado = avisoId !== null;
  const { liga, titulo, dia, hora, estado, donde,inicio,id, podio:podioTexto,marcador,local,visitante} = useLocalSearchParams<{
    liga: string;
    titulo: string;
    dia: string;
    hora: string;
    estado: string;
    donde: string;
    inicio:string,
    id:string,
    podio:string,
    marcador : string,
    local : string,
    visitante :string,
  }>();

  const color = COLORES[liga] ?? '#6B7280';
  const fondo = FONDOS[liga] ?? '#000000';
  const plataformas = donde ? donde.split('|').slice(0, 3) : [];
  const podio = podioTexto ? podioTexto.split('|'):[];
  const[ptsVisitante , ptsLocal] = marcador ? marcador.split(' - '): ['-','-']
  useEffect(() => {
    async function buscar(){
        const lista = await Notifications.getAllScheduledNotificationsAsync();
        const existente = lista.find((n) => n.content.data?.partidoId === id);
        if(existente) setAvisoId(existente.identifier);
    }
    buscar();
  },[id]);
  async function avisarme() {
    if(Platform.OS =='android'){
        try {
            await Notifications.setNotificationChannelAsync('default', {
            name: 'Partidos',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            });
        } catch (e) {
            console.log('No se pudo crear el canal, uso el de por defecto', e);
        }
    }
    const permiso = await Notifications.requestPermissionsAsync();
    if(!permiso.granted){
        Alert.alert('Permiso necesario','Activa las notificaciones de Expo Go en los ajustes del telefono.');
        return;
    }
    const aviso = new Date(new Date(inicio).getTime() - 15 * 60 * 1000);
    if(aviso.getTime() <= Date.now()){
        Alert.alert('Ya casi empieza','Este partido empieza en menos de 15 minutos o ya empezo.');
        return;
    }
    const nuevoId = await Notifications.scheduleNotificationAsync({
        content: {
            title:'Empieza en 15 minutos',
            body:`${titulo}\nDónde verlo: ${plataformas[0] ?? ''}`,
            data: {partidoId: id},
        },
        trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE, date:aviso},
    })
    setAvisoId(nuevoId);
  }
  async function cancelarAviso() {
    if(!avisoId)return;
    await Notifications.cancelScheduledNotificationAsync(avisoId);
    setAvisoId(null);
  }
  return (
    <ThemedView style={[styles.container, {backgroundColor: fondo}]}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable onPress={() => router.back()}>
          <ThemedText>← Volver</ThemedText>
        </Pressable>

        <ScrollView contentContainerStyle={styles.contenido}>
          {/* Encabezado: liga y título */}
          <ThemedView type="backgroundElement" style={[styles.encabezado, { borderLeftColor: color }]}>
            <ThemedText type="code" style={{ color }}>
              {liga}
            </ThemedText>
            <ThemedText style={styles.titulo}>{titulo}</ThemedText>
            {estado ? (
              <ThemedView style={[styles.etiqueta, { backgroundColor: color }]}>
                <ThemedText style={styles.textoEtiqueta}>{estado}</ThemedText>
              </ThemedView>
            ) : null}
          </ThemedView>

          {/* Fecha y hora */}
          <ThemedView type="backgroundElement" style={styles.bloque}>
            <ThemedView type="backgroundElement" style={styles.fila}>
              <ThemedText>📅 Fecha</ThemedText>
              <ThemedText style={styles.valor}>{dia}</ThemedText>
            </ThemedView>
            <ThemedView type="backgroundElement" style={styles.fila}>
              <ThemedText>🕑 Hora</ThemedText>
              <ThemedText style={styles.valor}>{hora}</ThemedText>
            </ThemedView>
          </ThemedView>
          {/*PODIO DE CARRERA YA TRASMITIDA */}
          {liga === 'F1' && podio.length > 0 && (
            <ThemedView type = "backgroundElement" style={styles.bloque}>
              <ThemedText style={styles.valor}>🏁 Podio</ThemedText>
              {podio.map((nombre, i)=> (
                <ThemedView key={nombre} type='backgroundElement' style={styles.fila}>
                  <ThemedText>
                    {['🥇', '🥈', '🥉'][i]} {nombre}
                  </ThemedText>
                </ThemedView>
              ))}
            </ThemedView>
          )}
          
          {liga !== 'F1' && (
            <ThemedView type='backgroundElement' style={styles.bloque}>
              <ThemedText style={styles.valor}>
                {marcador ? '🏟️ Resultado':'🏟️ Enfrentamiento'}
              </ThemedText>
              <ThemedView type="backgroundElement" style={styles.fila}>
                <ThemedText>{visitante}</ThemedText>
                <ThemedText style={styles.valor}>{ptsVisitante}</ThemedText>
              </ThemedView>
              <ThemedView type="backgroundElement" style={styles.fila}>
                <ThemedText>{local}</ThemedText>
                <ThemedText style={styles.valor}>{ptsLocal}</ThemedText>
              </ThemedView>
            </ThemedView>
          )}

          {/* Dónde verlo (se despliega) */}
          <ThemedView type="backgroundElement" style={styles.bloque}>
            <Pressable onPress={() => setAbierto(!abierto)} style={styles.fila}>
              <ThemedText style={styles.valor}>📺 Dónde verlo</ThemedText>
              <ThemedText>{abierto ? '▲' : '▼'}</ThemedText>
            </Pressable>

            {abierto &&
              plataformas.map((nombre, i) => (
                <ThemedView key={nombre} type="backgroundElement" style={styles.fila}>
                  <ThemedText>
                    {i + 1}. {nombre}
                  </ThemedText>
                </ThemedView>
              ))}

            {abierto && (
              <ThemedText type="small" style={styles.aviso}>
                Sugerencias para Colombia. Confirma en tu plataforma, porque los derechos cambian.
              </ThemedText>
            )}
          </ThemedView>
          {estado === '' &&(
            <Pressable
            onPress={avisado ? cancelarAviso : avisarme}
            style={[styles.botonAviso,{backgroundColor:color,opacity:avisado ? 0.6 : 1}]}>
                <ThemedText style={styles.textoBotonAviso}>
                    {avisado ? '✓ Aviso programado · toca para cancelar' : '🔔 Avisarme 15 min antes'}
                </ThemedText>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  contenido: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  encabezado: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderLeftWidth: 6,
    gap: Spacing.two,
    backgroundColor:'rgba(255,255,255,0.1)',
  },
  titulo: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
  },
  etiqueta: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.four,
  },
  textoEtiqueta: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bloque: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
    backgroundColor:'rgba(255,255,255,0.1)',
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
    backgroundColor:'transparent',
  },
  valor: {
    fontWeight: '600',
  },
  aviso: {
    opacity: 0.7,
  },
  botonAviso: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  textoBotonAviso:{
    color:'#FFFFFF',
    fontWeight:'700',
  },
});