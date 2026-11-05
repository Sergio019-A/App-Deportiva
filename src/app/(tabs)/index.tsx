import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
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
};

const BASE = 'https://site.api.espn.com/apis/site/v2/sports';

const LIGAS = [
  { nombre: 'NBA', url: `${BASE}/basketball/nba/scoreboard` },
  { nombre: 'NFL', url: `${BASE}/football/nfl/scoreboard` },
];

function textoEstado(estado: string) {
  if (estado === 'in') return 'En vivo';
  if (estado === 'post') return 'Finalizado';
  return '';
}

async function pedirLiga(liga: { nombre: string; url: string }): Promise<Partido[]> {
  const respuesta = await fetch(liga.url);
  const datos = await respuesta.json();

  return datos.events.map((e: any) => {
    const equipos = e.competitions[0].competitors;
    const local = equipos.find((t: any) => t.homeAway === 'home');
    const visitante = equipos.find((t: any) => t.homeAway === 'away');
    return {
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
      estado: e.status.type.state,
      inicio: e.date,
      titulo: `${visitante.team.displayName} vs ${local.team.displayName}`,
    };
  });
}

function fechaYMD(d: Date) {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
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

async function pedirF1(): Promise<Partido[]> {
  const hoy = new Date();
  const en30dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const rango = `${fechaYMD(hoy)}-${fechaYMD(en30dias)}`;
  const respuesta = await fetch(`${BASE}/racing/f1/scoreboard?dates=${rango}`);
  const datos = await respuesta.json();

  return datos.events.flatMap((e: any) =>
    e.competitions.map((c: any) => ({
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
    }))
  );
}

export default function HomeScreen() {
  const [seleccion, setSeleccion] = useState('Todas');
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function cargar() {
      try {
        const resultados = await Promise.all([...LIGAS.map(pedirLiga), pedirF1()]);
        const todos = resultados.flat();
        todos.sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
        setPartidos(todos);
      } catch {
        setError(true);
      } finally {
        setCargando(false);
      }
    }
    cargar();
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
              style={[styles.boton, seleccion === nombre && styles.botonActivo]}>
              <ThemedText>{nombre}</ThemedText>
            </Pressable>
          ))}
        </ThemedView>

        {cargando && <ActivityIndicator size="large" />}
        {error && <ThemedText>No pudimos cargar los partidos. Revisa tu conexión.</ThemedText>}
        {!cargando && !error && visibles.length === 0 && (
          <ThemedText>No hay partidos por ahora.</ThemedText>
        )}

        <ScrollView contentContainerStyle={styles.lista}>
          {visibles.map((p) => (
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
                  },
                })
              }>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="code" style={styles.textoCard}>
                  {p.liga}
                </ThemedText>
                <ThemedText style={styles.textoCard}>{p.titulo}</ThemedText>
                <ThemedText type="small" style={styles.textoCard}>
                  {p.dia} · {p.hora}
                </ThemedText>
                <ThemedText type="small" style={styles.textoCard}>
                  {textoEstado(p.estado)}
                </ThemedText>
              </ThemedView>
            </Pressable>
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
    backgroundColor: '#6B7280',
  },
  textoCard: {
    color: '#111827',
  },
});