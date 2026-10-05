# GrabThis AntiVirus ProGuard Rules

# Keep all classes in com.grabthis.antivirus
-keep class com.grabthis.antivirus.** { *; }

# Keep Activity and Application classes
-keep public class android.app.Activity
-keep public class android.app.Application
-keep public class android.app.Service

# Keep BuildConfig
-keep class **.BuildConfig { *; }

# Remove logging
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}

# Preserve line numbers for debugging
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
