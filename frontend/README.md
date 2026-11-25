# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Meta and RevenueCat attribution

Hera initializes the Meta SDK for install and activation attribution, then sends
the Facebook anonymous ID and platform advertising identifiers to RevenueCat.
RevenueCat is the only sender for subscription purchase and revenue events, which
prevents duplicate Meta purchase reporting.

Before producing a native build, configure these protected build-environment
variables using `.env.example` as the template:

- `META_ANDROID_APP_ID`
- `META_ANDROID_CLIENT_TOKEN`
- `META_IOS_APP_ID`
- `META_IOS_CLIENT_TOKEN`

Meta Conversions API access tokens belong only in the RevenueCat dashboard. Never
add a Conversions API access token to this repository or the mobile application.

This integration contains native modules and must be tested with a development,
TestFlight, or Play Store build; it is not available in Expo Go.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
