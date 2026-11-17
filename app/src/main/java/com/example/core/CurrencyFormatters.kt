package com.example.core

import java.text.NumberFormat
import java.util.Locale

fun formatNaira(amount: Long): String {
    val formatter = NumberFormat.getNumberInstance(Locale.Builder().setLanguage("en").setRegion("NG").build())
    return "₦${formatter.format(amount)}"
}

fun formatCompactCount(count: Long): String {
    return when {
        count >= 1_000_000 -> String.format(Locale.US, "%.1fM", count / 1_000_000.0)
        count >= 1_000 -> String.format(Locale.US, "%.1fK", count / 1_000.0)
        else -> count.toString()
    }
}

fun formatCountdown(remainingMs: Long): String {
    if (remainingMs <= 0L) return "00:00:00"
    val totalSeconds = remainingMs / 1000L
    val hours = totalSeconds / 3600L
    val minutes = (totalSeconds % 3600L) / 60L
    val seconds = totalSeconds % 60L
    return String.format(Locale.US, "%02d:%02d:%02d", hours, minutes, seconds)
}

val NIGERIAN_STATES: List<String> = listOf(
    "Lagos",
    "Abuja (FCT)",
    "Rivers",
    "Oyo",
    "Kano",
    "Ogun",
    "Enugu",
    "Anambra",
    "Delta",
    "Edo",
    "Kaduna",
    "Abia",
    "Akwa Ibom",
    "Cross River",
    "Ondo",
    "Osun",
    "Kwara",
    "Plateau",
    "Imo",
    "Ekiti",
    "Benue",
    "Borno",
    "Bauchi",
    "Adamawa",
    "Katsina",
    "Sokoto",
    "Niger",
    "Nasarawa",
    "Kogi",
    "Bayelsa",
    "Ebonyi",
    "Gombe",
    "Jigawa",
    "Kebbi",
    "Taraba",
    "Yobe",
    "Zamfara"
)

val MARKETPLACE_CATEGORIES: List<String> = listOf(
    "All",
    "Electronics",
    "Fashion",
    "Beauty",
    "Home & Kitchen",
    "Groceries",
    "Phones & Tablets",
    "Sneakers",
    "Watches & Jewelry"
)
