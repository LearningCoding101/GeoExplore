import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import MapView, { Polygon, Polyline } from "react-native-maps";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import * as turf from "@turf/turf";

const DefaultMap = ({ selectedArea }) => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [locations, setLocations] = useState([]);
  const [buffer, setBuffer] = useState([]);

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

            // Calculate the buffer
            if (updatedLocations.length > 1) {
              const line = turf.lineString(
                updatedLocations.map((loc) => [loc.longitude, loc.latitude])
              );
              const buffered = turf.buffer(line, 0.01, { units: "kilometers" });
              const bufferCoords = buffered.geometry.coordinates[0].map(
                ([longitude, latitude]) => ({
                  latitude,
                  longitude,
                })
              );
              setBuffer(bufferCoords);
            }
            return updatedLocations;
          });
        }
      );

      return () => {
        watchId.remove();
      };
    })();
  }, []);

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
          latitudeDelta: 0.1, // Adjusted to show a larger area
          longitudeDelta: 0.1,
        }}
        showsUserLocation={true}
        zoomEnabled={true}
        scrollEnabled={true}
      >
        {locations.length > 1 && (
          <>
            <Polyline
              coordinates={locations}
              strokeColor="#00FF00"
              strokeWidth={3}
            />
            {/* Render the buffer zone */}
            <Polygon
              coordinates={buffer}
              strokeColor="transparent"
              strokeWidth={0}
              fillColor="rgba(0,0,255,0.2)" // Transparent blue
            />
          </>
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
          selectedArea.geometry.type === "MultiPolygon" &&
          selectedArea.geometry.coordinates.map((polygon, index) => (
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
