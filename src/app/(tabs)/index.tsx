import { useRouter } from 'expo-router';
import { Fragment, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Partido = {
  id: string;
  local: string;
  visitante: string;
  hora: string;
  dia: string;
  liga: string;
  estado: string;
  inicio: string;
  titulo: string;
  marcador: string,
  podio : string,
};

const BASE = 'https://site.api.espn.com/apis/site/v2/sports';

const LIGAS = [
  { nombre: 'NBA', url: `${BASE}/basketball/nba/scoreboard` },
  { nombre: 'NFL', url: `${BASE}/football/nfl/scoreboard` },
  { nombre: 'Premier', url: `${BASE}/soccer/eng.1/scoreboard` },
  { nombre: 'LaLiga', url: `${BASE}/soccer/esp.1/scoreboard` },
  { nombre: 'Champions', url: `${BASE}/soccer/uefa.champions/scoreboard` },
  { nombre: 'Liga Betplay', url: `${BASE}/soccer/col.1/scoreboard` },
];

const DONDE_VER: Record<string, string[]> = {
  NBA: ['Disney+ Premium (ESPN)','ESPN en TV por cable','NBA League Pass'],
  NFL: ['Disney+ Premium (ESPN)','ESPN en TV por cable','ESPN Deportes'],
  F1: ['Disney+ Premium (ESPN)' ,'F1 TV','ESPN en TV por cable'],
  Premier: ['Disney+ Premium (ESPN)','ESPN en TV por cable','DSports'],
  LaLiga: ['Disney+ Premium (ESPN)','ESPN en TV por cable','DSports'],
  Champions: ['Disney+ Premium (ESPN)',' Paramount+','ESPN en TV por cable'],
  'Liga Betplay': ['Win Sports',' Win Play','DSports'],
};
const COLORES: Record<string,string>={
  Todas: '#6B7280',
  NBA: '#E56020',
  NFL: '#013369',
  F1: '#E10600',
  Premier: '#2F855A',
  LaLiga: '#2F855A',
  Champions: '#2F855A',
  'Liga Betplay': '#2F855A',
}

function textoEstado(estado: string) {
  if (estado === 'in') return 'En vivo';
  if (estado === 'post') return 'Finalizado';
  return '';
}
function etiquetaDia(inicio:string){
  const fecha= new Date(inicio);
  const hoy =new Date();
  const manana= new Date(Date.now() + 24 * 60 * 60 * 1000);
  if(fecha.toDateString()=== hoy.toDateString()) return 'Hoy';
  if(fecha.toDateString() === manana.toDateString())return 'Mañana';
  const texto = fecha.toLocaleDateString('es-CO',{
    weekday:'long',
    day:'numeric',
    month:'long',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
function fechaYMD(d: Date) {
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${anio}${mes}${dia}`;
}

async function pedirLiga(liga: { nombre: string; url: string }, numDias =7): Promise<Partido[]> {
  const dias = Array.from({ length: numDias}, (_, i) =>
    fechaYMD(new Date(Date.now() + i * 24 * 60 * 60 * 1000))
  );
  const respuestas = await Promise.all(
    dias.map((d) => fetch(`${liga.url}?dates=${d}`).then((r) => r.json()))
  );
  const eventos = respuestas.flatMap((d) => d.events ?? []);

  return eventos.flatMap((e: any) => {
    const equipos = e.competitions?.[0]?.competitors ?? [];
    const local = equipos.find((t: any) => t.homeAway === 'home');
    const visitante = equipos.find((t: any) => t.homeAway === 'away');

    if (!local?.team || !visitante?.team) return [];

    return [
      {
        id: liga.nombre + e.id,
        local: local.team.displayName,
        visitante: visitante.team.displayName,
        hora: new Date(e.date).toLocaleTimeString('es-CO', {
          hour: 'numeric',
          minute: '2-digit',
        }),
        dia: new Date(e.date).toLocaleDateString('es-CO', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
        liga: liga.nombre,
        estado: e.status?.type?.state ?? 'pre',
        inicio: e.date,
        titulo: `${visitante.team.displayName} vs ${local.team.displayName}`,
        marcador: 
          (e.status?.type?.state ?? 'pre') === 'pre'
          ? ''
          :`${visitante.score ?? 0} - ${local.score ?? 0}`,
          podio :'',
      },
    ];
  });
}

function nombreSesion(sigla?: string) {
  const nombres: Record<string, string> = {
    FP1: 'Práctica libre 1',
    FP2: 'Práctica libre 2',
    FP3: 'Práctica libre 3',
    Qual: 'Clasificación',
    Race: 'Carrera',
  };
  return (sigla && nombres[sigla]) ?? sigla ?? 'Sesión';
}
function podioF1(c:any){
  if(c.status?.type?.state !== 'post')return '';
  return[...(c.competitors ?? [])]
    .sort((a:any, b:any) => a.order - b.order)
    .slice(0,3)
    .map((p:any) => p.athlete?.shortName ?? p.athlete?.displayName ?? '')
    .join('|');
}
function ganadorF1(podio:string){
  const primero = podio.split('|')[0];
  return primero ? `🏆 ${primero}` : '';
}

async function pedirF1(): Promise<Partido[]> {
  const hoy = new Date(Date.now()-3 * 24 * 60 * 60 *1000);
  const en30dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const rango = `${fechaYMD(hoy)}-${fechaYMD(en30dias)}`;
  const respuesta = await fetch(`${BASE}/racing/f1/scoreboard?dates=${rango}`);
  const datos = await respuesta.json();
  const terminada = (datos.events ?? [])
  .flatMap((e:any) => e.competitions ?? [])
  .find((c:any) => c.status?.type?.state === 'post');
  console.log('F1 Terminada', JSON.stringify(terminada?.competitors?.slice(0,3)).slice(0,1500));

  return (datos.events ?? []).flatMap((e: any) =>
    (e.competitions ?? []).map((c: any) => ({
      id: 'F1' + e.id + c.id,
      local: '',
      visitante: '',
      titulo: `${e.name} · ${nombreSesion(c.type?.abbreviation)}`,
      hora: new Date(c.date).toLocaleTimeString('es-CO', {
        hour: 'numeric',
        minute: '2-digit',
      }),
      dia: new Date(c.date).toLocaleDateString('es-CO', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }),
      liga: 'F1',
      estado: c.status?.type?.state ?? 'pre',
      inicio: c.date,
      podio: podioF1(c),
      marcador: ganadorF1(podioF1(c)),
    }))
  );
}

export default function HomeScreen() {
  const [seleccion, setSeleccion] = useState('Todas');
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const router = useRouter();
  const [refrescando,setRefrescando]=useState(false);

  const hayVivos = useRef(false);
  async function cargar(soloHoy = false) {
    try {
      const resultados = await Promise.allSettled([
        ...LIGAS.map((l) => pedirLiga(l, soloHoy ? 1 : 7)),
        pedirF1(),
      ]);
      const nuevos = resultados.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

      setPartidos((anteriores) => {
        // Mezcla: los partidos nuevos reemplazan a los viejos con el mismo id
        const mapa = new Map(anteriores.map((p) => [p.id, p]));
        nuevos.forEach((p) => mapa.set(p.id, p));
        const todos = [...mapa.values()];
        todos.sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
        hayVivos.current = todos.some((p) => p.estado === 'in');
        return todos;
      });
      setError(false);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }
  useEffect(() => {
  cargar();
  const intervalo = setInterval(() => {
    if(hayVivos.current)cargar(true);
  }, 60*1000);
  return() => clearInterval(intervalo);
  }, []);

  const visibles =
    seleccion === 'Todas' ? partidos : partidos.filter((p) => p.liga === seleccion);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Quién juega hoy</ThemedText>

        <ThemedView style={styles.botones}>
          {['Todas', ...LIGAS.map((l) => l.nombre), 'F1'].map((nombre) => (
            <Pressable
              key={nombre}
              onPress={() => setSeleccion(nombre)}
              style={[
                styles.boton,
                seleccion == nombre ? styles.botonActivo : styles.botonInactivo,
                {backgroundColor:COLORES[nombre] ?? '#6B7280'},             
              ]}>
              <ThemedText style={styles.textoBoton}>{nombre}</ThemedText>
            </Pressable>
          ))}
        </ThemedView>

        {cargando && <ActivityIndicator size="large" />}
        {error && <ThemedText>No pudimos cargar los partidos. Revisa tu conexión.</ThemedText>}
        {!cargando && !error && visibles.length === 0 && (
          <ThemedText>No hay partidos por ahora.</ThemedText>
        )}

        <ScrollView 
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl 
          refreshing = {refrescando}
          onRefresh={() =>{
            setRefrescando(true);
            cargar(true);
          }}
          tintColor= '#FFFFFF'
          />
        }>
          {visibles.map((p, i) => (
          <Fragment key={p.id}>
              {(i === 0 || visibles[i - 1].dia !== p.dia) && (
                <ThemedText style={styles.tituloDia}>{etiquetaDia(p.inicio)}</ThemedText>
              )}
            <Pressable
              key={p.id}
              onPress={() =>
                router.push({
                  pathname: '/partido',
                  params: {
                    liga: p.liga,
                    titulo: p.titulo,
                    dia: p.dia,
                    hora: p.hora,
                    estado: textoEstado(p.estado),
                    donde: (DONDE_VER[p.liga] ??[]).join('|'),
                    inicio:p.inicio,
                    id:p.id,
                    podio : p.podio,
                  },
                })
              }>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="code" style={styles.textoCard}>
                  {p.liga}
                </ThemedText>
                <ThemedText style={styles.textoCard}>{p.titulo}</ThemedText>
                {p.marcador ?(
                  <ThemedText style={[styles.textoCard, styles.marcador]}>{p.marcador}</ThemedText>
                ): null}
                <ThemedText type="small" style={styles.textoCard}>
                  {p.dia} · {p.hora}
                </ThemedText>
                <ThemedText type="small" style={styles.textoCard}>
                  {textoEstado(p.estado)}
                </ThemedText>
              </ThemedView>
            </Pressable>
             </Fragment>
          ))}
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
  lista: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
    backgroundColor: '#FFFFFF',
  },
  botones: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  boton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
    borderWidth: 1,
    borderColor: '#6B7280',
    backgroundColor: '#9CA3AF',
  },
  botonActivo: {
    borderWidth:2,
  },
  botonInactivo:{
    opacity:1,
  },
  textoBoton:{
    color:'#FFFFFF',
    fontWeight:'600',
  },
  textoCard: {
    color: '#111827',
  },
  tituloDia:{
    fontSize: 20,
    fontWeight:'700',
    marginTop: Spacing.two,
  },
  marcador :{
    fontSize: 20,
    fontWeight:'700',
  },
});