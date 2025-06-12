  import { NavigationContainer } from '@react-navigation/native';
  import { createDrawerNavigator } from '@react-navigation/drawer';
  import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
  import { createNativeStackNavigator } from '@react-navigation/native-stack';
  import { StyleSheet } from 'react-native';
  import { SafeAreaProvider } from "react-native-safe-area-context";
  import { Toaster } from 'sonner-native';
  import { Ionicons } from '@expo/vector-icons';
  
  import HomeScreen from "./screens/HomeScreen";
  import DataScreen from "./screens/DataScreen";
  import StatsScreen from "./screens/StatsScreen";
  import PredictScreen from "./screens/PredictScreen";
  import SettingsScreen from "./screens/SettingsScreen";
  import CategoryDetailScreen from "./screens/CategoryDetailScreen";
  import ConsultScreen from "./screens/ConsultScreen";
  import HistoryScreen from "./screens/HistoryScreen";
  import { useTheme } from './hooks/useTheme';
  
  const Drawer = createDrawerNavigator();
  const Tab = createBottomTabNavigator();
  const Stack = createNativeStackNavigator();
  
  function MainTabs() {
    const theme = useTheme();
    
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;
            
            if (route.name === 'Accueil') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Données') {
              iconName = focused ? 'list' : 'list-outline';
            } else if (route.name === 'Statistiques') {
              iconName = focused ? 'stats-chart' : 'stats-chart-outline';
            } else if (route.name === 'Prédictions') {
              iconName = focused ? 'bulb' : 'bulb-outline';
            } else {
              iconName = 'ellipse';
            }
            
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.text + '80',
          tabBarStyle: {
            backgroundColor: theme.colors.card,
            borderTopColor: theme.colors.border,
          },
          headerShown: false,
        })}
      >
        <Tab.Screen name="Accueil" component={HomeScreen} />
        <Tab.Screen name="Données" component={DataScreen} />
        <Tab.Screen name="Statistiques" component={StatsScreen} />
        <Tab.Screen name="Prédictions" component={PredictScreen} />
      </Tab.Navigator>
    );
  }
  
  function DrawerNavigator() {
    const theme = useTheme();
    
    return (
      <Drawer.Navigator
        screenOptions={{
          headerShown: false,
          drawerStyle: {
            backgroundColor: theme.colors.background,
          },
          drawerActiveTintColor: theme.colors.primary,
          drawerInactiveTintColor: theme.colors.text,
        }}
      >
        <Drawer.Screen 
          name="Principale"
          component={MainTabs}
          options={{
            drawerIcon: ({ color }) => (
              <Ionicons name="home-outline" size={24} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Paramètres"
          component={SettingsScreen}
          options={{
            drawerIcon: ({ color }) => (
              <Ionicons name="settings-outline" size={24} color={color} />
            ),
          }}
        />
      </Drawer.Navigator>
    );
  }
  
  function RootStack() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={DrawerNavigator} />
        <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
        <Stack.Screen name="Consult" component={ConsultScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
      </Stack.Navigator>
    );
  }
  
  export default function App() {
    return (
      <SafeAreaProvider style={styles.container}>
        <Toaster />
        <NavigationContainer>
          <RootStack />
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      userSelect: "none"
    },
  });
