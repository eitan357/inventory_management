import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import OutboundScreen from './src/screens/OutboundScreen';
import StatusScreen from './src/screens/StatusScreen';
import ValidatorScreen from './src/screens/ValidatorScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#0d6efd',
          tabBarInactiveTintColor: '#888',
          headerStyle: { backgroundColor: '#0d6efd' },
          headerTintColor: '#fff',
          headerTitleAlign: 'center',
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'בית', tabBarLabel: 'בית', tabBarIcon: () => <Text>🏠</Text> }}
        />
        <Tab.Screen
          name="Inventory"
          component={InventoryScreen}
          options={{ title: 'מלאי', tabBarLabel: 'מלאי', tabBarIcon: () => <Text>📦</Text> }}
        />
        <Tab.Screen
          name="Outbound"
          component={OutboundScreen}
          options={{ title: 'ניפוק', tabBarLabel: 'ניפוק', tabBarIcon: () => <Text>📤</Text> }}
        />
        <Tab.Screen
          name="Status"
          component={StatusScreen}
          options={{ title: "מצב צ'", tabBarLabel: "מצב צ'", tabBarIcon: () => <Text>📋</Text> }}
        />
        <Tab.Screen
          name="Validator"
          component={ValidatorScreen}
          options={{ title: 'ולידטור', tabBarLabel: 'ולידטור', tabBarIcon: () => <Text>✅</Text> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
