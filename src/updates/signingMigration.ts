import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export function needsSigningMigration() {
  return (
    Platform.OS === 'android' &&
    requireOptionalNativeModule<{ needsSigningMigration: boolean }>(
      'ManageEmployeesUpdateSigning'
    )?.needsSigningMigration === true
  );
}
