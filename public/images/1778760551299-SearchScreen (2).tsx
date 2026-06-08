import React, {
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Image,
  Text,
  Platform,
  Pressable,
  Alert,
  PermissionsAndroid,
} from "react-native";
import {
  Camera,
  CameraDevice,
  useCameraDevice,
  useCameraDevices,
  useCameraFormat,
} from "react-native-vision-camera";

import Images from "../config/images";
import { COLORS } from "../config/styles";
import { BackButton } from "./BackButton";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import axios from "axios";
import ScanSearch from "./ScanScreen";
import Torch from "react-native-torch";
import { database } from "../helpers/Database";
import UserData from "../helpers/UserData";

import changeNavigationBarColor from "react-native-navigation-bar-color";
import { mergeImages } from "../utils/mergeImages.tsx";
import RNFS from "react-native-fs";
import { skImageToFile } from "../utils/skImageToFile";
import { saveFile } from "../utils/saveFile";
import { useSharedValue } from "react-native-reanimated";

const { width } = Dimensions.get("window");
const CIRCLE_SIZE = 250;
const SMALL_SCALE = 0.72;
const BIG_SCALE = 1;
const PEEK_OFFSET = 80;
const SLIDE_DISTANCE = CIRCLE_SIZE - PEEK_OFFSET;

const ZOOM_LEVELS = [1, 2, 3, 4];

export default function SearchScreen() {
  const navigation = useNavigation();
  const [query, setQuery] = useState("");
  const translateX = useRef(new Animated.Value(0)).current;
  const [cameraGranted, setCameraGranted] = useState(false);
  const [step, setStep] = useState(1);
  const [activeSlot, setActiveSlot] = useState<"first" | "second">("first");
  const [files, setFiles] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const firstCameraRef = useRef(null);
  const secondCameraRef = useRef(null);
  const [zoomFactor, setZoomFactor] = useState(1);
  const [zoom, setZoom] = useState(0);
  const [measure, setMeasure] = useState({
    x: 0,
    y: 0,
  });
  const [isInitialized, setIsInitialized] = useState(false);

  const device = useCameraDevice("back");

  const isSamsung =
    Platform.OS === "android" &&
    Platform.constants?.Brand?.toLowerCase() === "samsung";

  const format = useCameraFormat(device, [
    {
      videoResolution: isSamsung
        ? { width: 600, height: 600 }
        : { width: 1280, height: 720 },
    },
    { fps: 60 },
    { photoAspectRatio: 1 },
    { videoAspectRatio: 1 },
  ]);

  const fistCircleRef = useRef<TouchableOpacity>(null);

  const getPosition = (ref: RefObject<TouchableOpacity>) => {
    setTimeout(() => {
      ref.current?.measureInWindow((x, y, w, h) => {
        setMeasure({ x, y });
      });
    }, 200);
  };

  useEffect(() => {
    console.log(measure);
  }, [measure]);

  useFocusEffect(
    useCallback(() => {
      getPosition(fistCircleRef);
    }, [fistCircleRef]),
  );

  useFocusEffect(
    useCallback(() => {
      changeNavigationBarColor("#1C222B", true, false);
    }, []),
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("https://api.greydigger.ru/config", {
          method: "GET",
          headers: {
            "X-API-Key": "dd1a67e6-0fb5-44f9-9bd5-11da82daaa7d",
            "Content-Type":
              "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW",
          },
        });

        const result = await res.json();

        if (!res.ok) {
          Alert.alert("Ошибка", result.message);
          return;
        }

        console.log("result", result);
      } catch (e) {
        console.log(e);
      }
    })();
  }, []);

  const requestCameraPermission = async () => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
        );
        setCameraGranted(granted === PermissionsAndroid.RESULTS.GRANTED);
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else {
      const status = await Camera.requestCameraPermission();

      setCameraGranted(status === "granted");
    }
    return true;
  };

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const handleZoomPress = (zoomFactor) => {
    setZoomFactor(zoomFactor);

    switch (zoomFactor) {
      case 1:
        setZoom(device?.neutralZoom);
        break;

      case 2:
        setZoom(2);
        break;

      case 3:
        setZoom(3);
        break;

      case 4:
        setZoom(4);
        break;

      default:
        setZoom(device?.neutralZoom);
        break;
    }
  };

  const SLOT_POS = {
    first: 0,
    second: -SLIDE_DISTANCE * 1.5,
  };
  const animateToSlot = (slot: "first" | "second") => {
    //Анимация переключения с лицевой стороны на оборотную и обратно
    Animated.timing(translateX, {
      toValue: SLOT_POS[slot],
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setActiveSlot(slot);
      if (step < 3) {
        setStep(slot === "first" ? 1 : 2);
      }
    });
  };

  const scaleFirst = translateX.interpolate({
    inputRange: [-(width - 80), 0],
    outputRange: [SMALL_SCALE, BIG_SCALE],
    extrapolate: "clamp",
  });
  const scaleSecond = translateX.interpolate({
    inputRange: [-(width - 80), 0],
    outputRange: [BIG_SCALE, SMALL_SCALE],
    extrapolate: "clamp",
  });

  const takePhoto = async (ref) => {
    try {
      if (cameraGranted) {
        if (ref.current) {
          try {
            const photo = await ref?.current?.takePhoto();

            setFiles([
              ...files,
              {
                index: activeSlot === "first" ? 0 : 1,
                uri: `file://${photo.path}`,
                ...photo,
              },
            ]);

            if (activeSlot === "first") {
              setStep(2);
            } else if (activeSlot === "second") {
              setStep(1);
            }
          } catch (error) {
            console.error("Error taking photo:", error);
            Alert.alert("Ошибка", "Не удалось сделать фото");
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  // useEffect(() => {
  //   (async () => {
  //     const coin = await database.getCoinById(153);

  //     console.log("handle coin ======>", coin);
  //   })();
  // }, []);

  const onGalleryPress = () => {
    //выбрать фото из галереи
    launchImageLibrary({ mediaType: "photo", quality: 1 }, (response) => {
      if (response.didCancel || response.errorCode) return;

      const file = response.assets?.[0];
      console.log(response.assets);

      if (!file) return;

      if (activeSlot === "first") {
        setFiles([...files, { index: 0, ...file }]);
      } else {
        setFiles([...files, { index: 1, ...file }]);
      }
    });
  };

  const onSend = async () => {
    const formData = new FormData();

    setSearchOpen(true);

    mergeImages(files[0].uri, files[1].uri)
      .then(async (image) => {
        const file = await skImageToFile(image);

        // saveFile(file.uri, `${RNFS.DownloadDirectoryPath}/image.jpg`);

        formData.append("image", file);

        try {
          const res = await fetch(
            "https://api.greydigger.ru/api_coins/coin-info",
            {
              method: "POST",
              body: formData,
              headers: {
                "X-API-Key": "dd1a67e6-0fb5-44f9-9bd5-11da82daaa7d",
                "Content-Type":
                  "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW",
              },
            },
          );

          const result = await res.json();

          if (!res.ok) {
            Alert.alert("Ошибка", result.message);
            return;
          }

          const coin = await database.getCoinById(result?.id);

          console.log("coin ================>", coin);

          const inaccessible = await database.isCoinPaid(coin?.id);

          if (!inaccessible) {
            if (coin) {
              navigation.navigate("CoinDetail", { coin, id: result.id });
            } else {
              navigation.navigate("ErrorScreen", {
                images: files,
              });
            }
          } else {
            navigation.navigate("SuccessScreen", {
              images: files,
            });
          }
        } catch (error) {
          console.log(error);

          navigation.navigate("ErrorScreen", { images: files });
        } finally {
          setSearchOpen(false);
        }
      })
      .catch((e) => {
        console.log(e);
      });
  };

  const removePhoto = (index) => {
    const filteredList = files.filter((file) => file.index !== index);

    setFiles(filteredList);
  };

  useEffect(() => {
    const firstImage = files.find((file) => file.index === 0);
    const secondImage = files.find((file) => file.index === 1);

    if (firstImage && secondImage) {
      setStep(3);
    } else if (firstImage && !secondImage) {
      setStep(2);
      animateToSlot("second");
    } else if (!firstImage && secondImage) {
      setStep(1);
      animateToSlot("first");
    }
  }, [files]);

  const backPressed = () => {
    changeNavigationBarColor("#463522", true, false);
    navigation.goBack();
  };

  return (
    <>
      <View style={styles.container}>
        {step < 3 && (
          <View
            style={{
              width: 220,
              height: 220,
              borderRadius: 1000,
              overflow: "hidden",
              position: "absolute",
              top: measure.y + (activeSlot === "first" ? 5 : 3),
              left: measure.x + (activeSlot === "first" ? 5 : 0),
              borderStyle: "solid",
            }}
          >
            {device && (
              <Camera
                resizeMode="cover"
                ref={firstCameraRef}
                torch={torchActive ? "on" : "off"}
                format={format}
                onInitialized={() => setIsInitialized(true)}
                style={
                  isInitialized
                    ? {
                        flex: 1,
                        width: 220,
                        height: 220,
                      }
                    : {
                        width: 0,
                        height: 0,
                        flex: 0,
                      }
                }
                device={device}
                isActive={true}
                photo={true}
                // enableZoomGesture={true}
                zoom={zoom}
                orientation="portrait"
              />
            )}
          </View>
        )}
        <BackButton onPress={backPressed} />
        {/* Верх - текст */}
        <View style={styles.header}>
          <View style={styles.textBlock}>
            <Text style={styles.title}>Фотопоиск</Text>
            <Text style={styles.subtitle}>
              Сфотографируйте обе стороны монеты, либо выберите фотографии из
              галереи.
            </Text>
          </View>
        </View>
        {/* Центр - фото */}
        <View style={styles.circleWrapper}>
          <Animated.View
            style={[styles.circlesRow, { transform: [{ translateX }] }]}
          >
            {/*Первое фото*/}
            <Animated.View
              style={[styles.circle, { transform: [{ scale: scaleFirst }] }]}
            >
              {files.find((file) => file.index === 0)?.uri && (
                <Image
                  source={{
                    uri: files.find((file) => file.index === 0)?.uri,
                  }}
                  style={styles.photo}
                />
              )}
              <TouchableOpacity
                ref={fistCircleRef}
                style={StyleSheet.absoluteFill}
                onPress={() => animateToSlot("first")}
              />
              {files?.find((file) => file.index === 0)?.uri && (
                <TouchableOpacity
                  style={styles.cancel}
                  onPress={() => removePhoto(0)}
                >
                  <View style={styles.blurWrapper}>
                    <Image style={styles.img} source={Images.cross} />
                  </View>
                </TouchableOpacity>
              )}
            </Animated.View>
            {/*Второе фото*/}
            <Animated.View
              style={[styles.circle, { transform: [{ scale: scaleSecond }] }]}
            >
              {files.find((file) => file.index === 1)?.uri ? (
                <Image
                  source={{
                    uri: files.find((file) => file.index === 1)?.uri,
                  }}
                  style={styles.photo}
                />
              ) : (
                activeSlot === "second" && cameraGranted && <></>
              )}

              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                onPress={() => animateToSlot("second")}
              />
              {files?.find((file) => file.index === 1)?.uri && (
                <TouchableOpacity
                  style={styles.cancel}
                  onPress={() => removePhoto(1)}
                >
                  <View style={styles.blurWrapper}>
                    <Image style={styles.img} source={Images.cross} />
                  </View>
                </TouchableOpacity>
              )}
            </Animated.View>
          </Animated.View>
        </View>
        {/* Низ - кнопки */}

        <View style={styles.footer}>
          <View style={styles.progress}>
            <Text style={styles.progressStep}>
              {activeSlot === "first" ? "1" : "2"} из 2
            </Text>
            <Text style={styles.progressHint}>
              {activeSlot === "first" ? "Лицевая сторона" : "Оборотная сторона"}
            </Text>
          </View>
          {step < 3 && (
            <View style={styles.controls}>
              {ZOOM_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[styles.button, zoomFactor === level && styles.active]}
                  onPress={() => handleZoomPress(level)}
                >
                  <Text style={styles.text}>{level}×</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {step < 3 ? (
            <View style={styles.toolbar}>
              {/*кнопка галереи*/}
              <TouchableOpacity style={styles.bubble} onPress={onGalleryPress}>
                <Image source={Images.gallery} style={styles.img} />
              </TouchableOpacity>
              {/*кнопка камеры*/}

              <TouchableOpacity onPress={() => takePhoto(firstCameraRef)}>
                <Image source={Images.photo} style={styles.photoButton} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bubble}
                onPress={() => setTorchActive(!torchActive)}
              >
                <Image source={Images.splash} style={styles.img} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.bigButton} onPress={onSend}>
              {/*переход на экран с анимацией скана*/}
              <Text style={styles.bigButtonText}>Определить монету</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {searchOpen && (
        <ScanSearch
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          images={files}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
  },
  header: {
    flex: 2,
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingTop: 30,
  },
  back: {
    position: "absolute",
    left: 50,
    top: 70,
    width: 20,
    height: 20,
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  textBlock: {
    alignItems: "center",
    paddingHorizontal: 22,
  },
  title: {
    fontFamily: "AvenirNextCyrDemi",
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 26,
  },
  subtitle: {
    fontFamily: "AvenirNextCyrRegular",
    color: COLORS.textLight,
    fontWeight: "400",
    fontSize: 12,
    textAlign: "center",
  },
  circleWrapper: {
    flex: 3,
    justifyContent: "center",
    width: width,
    height: 300,
    overflow: "hidden",
    alignItems: "center",
  },
  circlesRow: {
    flexDirection: "row",
    width: CIRCLE_SIZE,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: COLORS.otherCoin,
    borderColor: COLORS.otherCoin,
    borderWidth: 10,
    borderStyle: "solid",
  },
  photo: {
    width: "100%",
    height: "100%",
    borderRadius: CIRCLE_SIZE / 2,
  },
  footer: {
    flex: 2,
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingBottom: 150,
  },
  progress: {
    alignItems: "center",
  },
  progressStep: {
    fontFamily: "AvenirNextCyrMedium",
    fontSize: 16,
    fontWeight: "400",
    textAlign: "center",
    color: COLORS.text,
    marginBottom: 19,
  },
  progressHint: {
    fontFamily: "AvenirNextCyrRegular",
    fontSize: 12,
    fontWeight: "400",
    textAlign: "center",
    color: COLORS.textLight,
  },
  toolbar: {
    position: "absolute",
    bottom: 76,
    flexDirection: "row",
    justifyContent: "space-between",
    width: "70%",
    alignItems: "center",
  },
  bubble: {
    width: 47,
    height: 47,
    borderRadius: 100,
    backgroundColor: COLORS.icon,
    justifyContent: "center",
    alignItems: "center",
  },
  img: {
    width: 20,
    height: 20,
    color: COLORS.text,
  },
  photoButton: {
    width: 75,
    height: 75,
    borderRadius: 125,
  },
  bigButton: {
    position: "absolute",
    bottom: 76,
    textAlign: "center",
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: 20,
    paddingVertical: 20,
    width: "70%",
  },
  bigButtonText: {
    color: COLORS.textPrimary,
    fontFamily: "AvenirNextCyrMedium",
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
  },
  cancel: {
    borderRadius: 100,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
  },
  blurWrapper: {
    width: 47,
    height: 47,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 100,
    backgroundColor: COLORS.otherCoin,
  },

  controls: {
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    padding: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
  },
  active: {
    backgroundColor: "#ffffff33",
    borderRadius: 12,
  },
  text: {
    color: "white",
    fontSize: 16,
  },
});
