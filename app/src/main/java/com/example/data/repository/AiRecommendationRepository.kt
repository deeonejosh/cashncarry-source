package com.example.data.repository

import com.example.data.model.Product

data class AiSearchAdvice(
    val summary: String,
    val recommendedProductIds: List<String>,
    val suggestedQueries: List<String>
)

class AiRecommendationRepository {

    suspend fun getSearchRecommendations(
        query: String,
        selectedState: String,
        catalog: List<Product>,
        recentIds: List<String>
    ): Result<AiSearchAdvice> {
        val cleanQuery = query.trim().lowercase()
        val queryTokens = cleanQuery.split(Regex("\\s+")).filter { it.length >= 2 }

        val ranked = catalog.sortedByDescending { prod ->
            var score = 0
            val haystack = "${prod.title} ${prod.description} ${prod.category} ${prod.brand}".lowercase()
            for (token in queryTokens) {
                if (haystack.contains(token)) score += 10
            }
            if (prod.deliveryStates.any { it.equals(selectedState, ignoreCase = true) }) score += 3
            if (prod.isFlashDeal) score += 2
            if (recentIds.contains(prod.id)) score += 1
            score
        }

        val topMatches = ranked.take(4)
        val categories = topMatches.map { it.category }.distinct()
        val suggestions = buildList {
            if (categories.isNotEmpty()) add("Best ${categories.first()} in $selectedState")
            add("Flash deals under ₦100,000")
            if (queryTokens.isNotEmpty()) add("${queryTokens.first()} verified sellers")
        }.distinct().take(3)

        val summary = if (topMatches.isEmpty()) {
            "No direct matches found for \"$query\" yet. Try browsing our verified categories shipping to $selectedState."
        } else {
            "Found ${topMatches.size} marketplace picks matching \"$query\" with delivery coverage to $selectedState."
        }

        return Result.success(
            AiSearchAdvice(
                summary = summary,
                recommendedProductIds = topMatches.map { it.id },
                suggestedQueries = suggestions
            )
        )
    }
}
