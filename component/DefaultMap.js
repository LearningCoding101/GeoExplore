import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, Button } from "react-native";
import * as Location from "expo-location";
import MapView, { Marker, Polygon, Polyline } from "react-native-maps";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { feature } from "topojson-client";

// Importing the world data
import countries from "world-atlas/countries-50m.json";
const worldGeoJSON = feature(countries, countries.objects.countries);

const DefaultMap = () => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      let savedLocations = await AsyncStorage.getItem("userLocations");
      if (savedLocations) {
        setLocations(JSON.parse(savedLocations));
      }

      try {
        let location = await Location.getCurrentPositionAsync({});
        setLocation(location.coords);
      } catch (error) {
        setErrorMsg("Failed to get current location");
      }

      const watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          const newCoords = { latitude, longitude };
          setLocations((prevLocation) => {
            const updatedLocations = [...prevLocation, newCoords];
            AsyncStorage.setItem(
              "userLocations",
              JSON.stringify(updatedLocations)
            );
            return updatedLocations;
          });
        }
      );

      return () => {
        watchId.remove();
      };
    })();
  }, []);

  const selectCountry = (countryName) => {
    const country = worldGeoJSON.features.find(
      (f) => f.properties.name === countryName
    );
    if (country) {
      console.log("Country data:", JSON.stringify(country.geometry));
      setSelectedArea({
        name: countryName,
        type: country.geometry.type,
        coordinates: country.geometry.coordinates,
      });
    } else {
      setErrorMsg("Country not found");
    }
  };

  if (errorMsg) {
    return (
      <View style={styles.centerContainer}>
        <Text>{errorMsg}</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <MapView
        style={styles.mainMap}
        initialRegion={{
          latitude: location?.latitude || 0,
          longitude: location?.longitude || 0,
          latitudeDelta: 20.0, // Adjusted to show a larger area
          longitudeDelta: 20.0,
        }}
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title="You are here"
          />
        )}
        {locations.length > 1 && (
          <Polyline
            coordinates={locations}
            strokeColor="#00FF00"
            strokeWidth={3}
          />
        )}
        {selectedArea && selectedArea.type === "Polygon" && (
          <Polygon
            coordinates={selectedArea.coordinates[0].map(
              ([longitude, latitude]) => ({ latitude, longitude })
            )}
            strokeColor="#FF0000"
            strokeWidth={2}
            fillColor="rgba(255,0,0,0.1)"
          />
        )}
        {selectedArea &&
          selectedArea.type === "MultiPolygon" &&
          selectedArea.coordinates.map((polygon, index) => (
            <Polygon
              key={index}
              coordinates={polygon[0].map(([longitude, latitude]) => ({
                latitude,
                longitude,
              }))}
              strokeColor="#FF0000"
              strokeWidth={2}
              fillColor="rgba(255,0,0,0.1)"
            />
          ))}
      </MapView>
      <View style={styles.buttonContainer}>
        <Button title="Vietnam" onPress={() => selectCountry("Vietnam")} />
      </View>
      {selectedArea && (
        <View style={styles.infoBox}>
          <Text>{selectedArea.name}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainMap: {
    flex: 1,
  },
  buttonContainer: {
    padding: 10,
  },
  infoBox: {
    padding: 10,
    backgroundColor: "white",
    alignItems: "center",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default DefaultMap;
