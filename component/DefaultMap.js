import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import MapView, { Polygon, Polyline } from "react-native-maps";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import * as turf from "@turf/turf";
import * as BackgroundFetch from "expo-background-fetch";
import { registerBackgroundFetch } from "../task/location-fetch";

const DefaultMap = ({ selectedArea }) => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [locations, setLocations] = useState([]);
  const [buffer, setBuffer] = useState([]);
  const [color, setColor] = useState("rgba(0,0,255,0.2)"); // Default color
  const [zoneFrequency, setZoneFrequency] = useState({});
  const [exploredArea, setExploredArea] = useState(0);
  useEffect(() => {
    registerBackgroundFetch();
    BackgroundFetch.setMinimumIntervalAsync(15 * 60);
  }, []);

  //calculate the total area covered everytime new locations is added
  useEffect(() => {
    if (selectedArea == null) {
      setExploredArea(0);
      return;
    }
    if (locations.length > 1) {
      const path = turf.lineString(
        locations.map((loc) => [loc.longitude, loc.latitude])
      );
      const areaCovered = turf.buffer(path, 10, { units: "meters" });
      let totalArea;
      if (selectedArea.geometry.type === "MultiPolygon") {
        totalArea = turf.multiPolygon(selectedArea.geometry.coordinates);
      } else {
        totalArea = turf.polygon(selectedArea.geometry.coordinates);
      }
      console.log("Selected Area:", selectedArea);
      console.log("Area Covered:", areaCovered);

      // Calculate intersection and explored area
      let intersectArea = null;
      if (totalArea.geometry.type === "MultiPolygon") {
        // If totalArea is a MultiPolygon, intersect with each polygon
        totalArea.geometry.coordinates.forEach((polygonCoords) => {
          const polygon = turf.polygon(polygonCoords);
          const intersection = turf.intersect(polygon, areaCovered);
          if (intersection) {
            intersectArea = intersectArea
              ? turf.union(intersectArea, intersection)
              : intersection;
          }
        });
      } else {
        // If totalArea is a Polygon, intersect directly
        intersectArea = turf.intersect(totalArea, areaCovered);
      }

      if (intersectArea) {
        const explored = turf.area(intersectArea) / turf.area(totalArea);
        setExploredArea(explored);
      } else {
        setExploredArea(0);
      }
    } else {
      setExploredArea(0); // No coverage if fewer than 2 locations
    }
  }, [locations, selectedArea]);

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

            // Define grid size (e.g., 0.01 degrees)
            const gridSize = 0.01;
            const gridKey = `${Math.round(latitude / gridSize)}_${Math.round(
              longitude / gridSize
            )}`;

            setZoneFrequency((prevMap) => {
              const newMap = { ...prevMap };
              newMap[gridKey] = (newMap[gridKey] || 0) + 1;
              return newMap;
            });

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

              // Update color based on zone frequency
              const maxFrequency = Math.max(...Object.values(zoneFrequency));
              const visitCount = zoneFrequency[gridKey] || 0;
              const newColor = getColorFromFrequency(visitCount, maxFrequency);
              setBuffer(bufferCoords);
              setColor(newColor);
            }
            return updatedLocations;
          });
        }
      );

      return () => {
        watchId.remove();
      };
    })();
  }, [zoneFrequency]);

  const getColorFromFrequency = (frequency, maxFrequency) => {
    const ratio = Math.min(frequency / maxFrequency, 1);
    const red = Math.round(255 * (1 - ratio));
    const blue = Math.round(255 * ratio);
    return `rgba(${red}, 0, ${blue}, 0.2)`;
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
          latitudeDelta: 0.05, // Smaller value for a closer view
          longitudeDelta: 0.05, // Smaller value for a closer view
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
            {/* Render the gradient buffer zone */}
            <Polygon
              coordinates={buffer}
              strokeColor="transparent"
              strokeWidth={0}
              fillColor={color} // Gradient color
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
      <Text style={styles.explored}>{exploredArea}</Text>
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
  explored: {
    position: "absolute",
    bottom: 35,
    left: "50%",
  },
});

export default DefaultMap;
