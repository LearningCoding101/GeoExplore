import { StyleSheet, Text, View } from "react-native";
import React, { useEffect, useState } from "react";
import * as Location from "expo-location";
import MapView, { Marker, Polyline } from "react-native-maps";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DefaultMap = () => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }
      let savedLocations = AsyncStorage.getItem("userLocations");
      if (savedLocations) {
        setLocations(JSON.parse(savedLocations));
      }
      let location = await Location.getCurrentPositionAsync({});
      setLocation(location.coords);
      const watchId = Location.watchPositionAsync(
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
    })();
  }, []);

  if (errorMsg) {
    return <Text>{errorMsg}</Text>;
  }

  if (!location) {
    return <Text>Waiting...</Text>;
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.mainMap}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        scrollEnabled={true}
        zoomEnabled={true}
        rotateEnabled={true}
        pitchEnabled={true}
      >
        <Marker
          coordinate={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          title="You are here"
        />
        {locations.length > 1 && (
          <Polyline
            coordinates={locations}
            strokeColor="#00FF00"
            strokeWidth={3}
          />
        )}
      </MapView>
    </View>
  );
};

export default DefaultMap;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainMap: {
    flex: 1,
  },
});
