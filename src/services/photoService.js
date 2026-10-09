// Hardware layer: takes a photo with the phone camera and keeps it on the phone
import * as ImagePicker from "expo-image-picker";
import { File, Paths } from "expo-file-system";

export async function takePhoto() {
  // 1. Ask for camera permission (the OS shows a popup the first time)
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error("PERMISSION_DENIED");

  // 2. Open the camera. quality 0.5 = compressed, smaller file
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.5,
  });
  if (result.canceled) return null;

  // 3. The camera saves to a temporary cache folder that the OS may clear,
  //    so copy the photo into the app's permanent document folder
  const source = new File(result.assets[0].uri);
  const destination = new File(Paths.document, `item-${Date.now()}.jpg`);
  await source.copy(destination);
  return destination.uri;
}
