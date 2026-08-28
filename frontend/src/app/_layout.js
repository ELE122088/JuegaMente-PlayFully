import { Stack } from 'expo-router';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { SidebarProvider } from '../context/SidebarContext';

function RootLayoutNav() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false, // Ocultamos el header por defecto para usar nuestro componente Header personalizado
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="quiz" />
      <Stack.Screen name="results" />
      <Stack.Screen name="admin" />
    </Stack>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <RootLayoutNav />
      </SidebarProvider>
    </ThemeProvider>
  );
}
