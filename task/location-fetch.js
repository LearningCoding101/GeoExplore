import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BACKGROUND_FETCH_TASK = "background-fetch-task";

// Define the task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.log("Permission to access location was denied");
      return BackgroundFetch.Result.Failed;
    }

    let location = await Location.getCurrentPositionAsync({});
    let savedLocations = await AsyncStorage.getItem("userLocations");
    let locations = savedLocations ? JSON.parse(savedLocations) : [];

    locations.push({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    await AsyncStorage.setItem("userLocations", JSON.stringify(locations));

    // Perform other background operations if needed
    console.log("Background fetch completed:", locations);
    return BackgroundFetch.Result.NewData;
  } catch (error) {
    console.error("Background fetch failed:", error);
    return BackgroundFetch.Result.Failed;
  }
});

export const registerBackgroundFetch = async () => {
  await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
    minimumInterval: 15 * 60, // Minimum interval of 15 minutes
    stopOnTerminate: false,
    startOnBoot: true,
  });
};

export const test = async () => {
  console.log("hello world");
};
