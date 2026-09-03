import React from 'react';
import { Image, StyleSheet } from 'react-native';

interface AppLogoProps {
  size?: number;
}

const AppLogo: React.FC<AppLogoProps> = ({ size = 64 }) => {
  return (
    <Image
      source={require('../../assets/images/logo.png')}
      style={[
        styles.logo,
        {
          width: size,
          height: size,
        },
      ]}
      resizeMode="contain"
    />
  );
};

const styles = StyleSheet.create({
  logo: {
    // Keeps the original proportions of your logo
  },
});

export default AppLogo;