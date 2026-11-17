package com.example.data.model

sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Success<T>(val data: T) : UiState<T>
    data class Error(val message: String) : UiState<Nothing>
}

data class UserProfile(
    val id: String = "",
    val userId: String = "",
    val displayName: String = "",
    val avatarKey: String = "",
    val bio: String = "",
    val selectedState: String = "Lagos",
    val role: String = "buyer",
    val sellerStatus: String = "none",
    val verified: Boolean = false,
    val suspended: Boolean = false,
    val followingSellerIds: List<String> = emptyList(),
    val recentProductIds: List<String> = emptyList(),
    val createdAtEpochMs: Long = 0L,
    val updatedAtEpochMs: Long = 0L
) {
    val isApprovedSeller: Boolean
        get() = role.equals("seller", ignoreCase = true) &&
            sellerStatus.equals("approved", ignoreCase = true) &&
            verified &&
            !suspended
}

data class SellerApplication(
    val id: String = "",
    val userId: String = "",
    val businessName: String = "",
    val cacNumber: String = "",
    val businessType: String = "Retail",
    val stateLocation: String = "Lagos",
    val phone: String = "",
    val description: String = "",
    val status: String = "none",
    val reviewerNotes: String = "",
    val createdAtEpochMs: Long = 0L,
    val updatedAtEpochMs: Long = 0L
)

data class BuyerAddress(
    val id: String = "",
    val recipient: String = "",
    val phone: String = "",
    val line: String = "",
    val city: String = "",
    val state: String = "Lagos"
)

data class UserPrivateInfo(
    val id: String = "",
    val userId: String = "",
    val email: String = "",
    val phone: String = "",
    val shippingAddress: String = "",
    val shippingState: String = "Lagos",
    val addressId: String = "",
    val savedPaymentReady: Boolean = false,
    val createdAtEpochMs: Long = 0L,
    val updatedAtEpochMs: Long = 0L
)

data class CartItem(
    val id: String = "",
    val userId: String = "",
    val productId: String = "",
    val sellerId: String = "",
    val sellerName: String = "",
    val productTitle: String = "",
    val variantLabel: String = "Standard",
    val unitPriceNaira: Long = 0L,
    val quantity: Long = 1L,
    val imageKey: String = "",
    val createdAtEpochMs: Long = 0L,
    val updatedAtEpochMs: Long = 0L
)

data class WishlistItem(
    val id: String = "",
    val userId: String = "",
    val productId: String = "",
    val productTitle: String = "",
    val priceNaira: Long = 0L,
    val sellerName: String = "",
    val imageKey: String = "",
    val createdAtEpochMs: Long = 0L
)

data class WalletBalance(
    val id: String = "",
    val userId: String = "",
    val purchasedCoins: Long = 0L,
    val promoTestCoins: Long = 0L,
    val totalSpentNaira: Long = 0L,
    val createdAtEpochMs: Long = 0L,
    val updatedAtEpochMs: Long = 0L
)

data class WalletLedgerEntry(
    val id: String = "",
    val userId: String = "",
    val idempotencyKey: String = "",
    val entryType: String = "coin_purchase",
    val coinBucket: String = "purchased",
    val coinDelta: Long = 0L,
    val amountNaira: Long = 0L,
    val description: String = "",
    val createdAtEpochMs: Long = 0L
)

data class SellerStorefront(
    val id: String = "",
    val ownerId: String = "",
    val businessName: String = "",
    val tagline: String = "",
    val stateLocation: String = "",
    val themeId: String = "emerald",
    val logoKey: String = "",
    val bannerKey: String = "",
    val verified: Boolean = false,
    val rating: Double = 0.0,
    val followersCount: Long = 0L,
    val giftEarningsCoins: Long = 0L,
    val policies: String = "",
    val status: String = "active",
    val createdAtEpochMs: Long = 0L,
    val updatedAtEpochMs: Long = 0L
)

data class Product(
    val id: String = "",
    val sellerId: String = "",
    val sellerName: String = "",
    val title: String = "",
    val description: String = "",
    val category: String = "",
    val subcategory: String = "",
    val brand: String = "",
    val priceNaira: Long = 0L,
    val originalPriceNaira: Long = 0L,
    val stockCount: Long = 0L,
    val rating: Double = 0.0,
    val reviewCount: Long = 0L,
    val imageKey: String = "",
    val variants: List<String> = emptyList(),
    val deliveryStates: List<String> = emptyList(),
    val isFlashDeal: Boolean = false,
    val flashDealEndEpochMs: Long = 0L,
    val liveStreamId: String = "",
    val status: String = "active",
    val revision: Long = 1L,
    val createdAtEpochMs: Long = 0L,
    val updatedAtEpochMs: Long = 0L
)

data class ProductReview(
    val id: String = "",
    val productId: String = "",
    val userId: String = "",
    val userName: String = "",
    val rating: Long = 0L,
    val comment: String = "",
    val visibility: String = "public",
    val createdAtEpochMs: Long = 0L
)

data class Livestream(
    val id: String = "",
    val sellerId: String = "",
    val sellerName: String = "",
    val title: String = "",
    val category: String = "",
    val coverKey: String = "",
    val streamUrl: String = "",
    val status: String = "live",
    val viewerCount: Long = 0L,
    val likesCount: Long = 0L,
    val pinnedProductId: String = "",
    val pinnedProductTitle: String = "",
    val pinnedProductPriceNaira: Long = 0L,
    val flashDealProductId: String = "",
    val flashDealDiscountPercent: Long = 0L,
    val flashDealEndEpochMs: Long = 0L,
    val scheduledAtEpochMs: Long = 0L,
    val qualityPreset: String = "1080p HD",
    val createdAtEpochMs: Long = 0L,
    val updatedAtEpochMs: Long = 0L
)

data class StreamMessage(
    val id: String = "",
    val streamId: String = "",
    val userId: String = "",
    val userName: String = "",
    val text: String = "",
    val isSystem: Boolean = false,
    val visibility: String = "public",
    val createdAtEpochMs: Long = 0L
)

data class TopGifterEntry(
    val id: String = "",
    val streamId: String = "",
    val userId: String = "",
    val userName: String = "",
    val totalCoins: Long = 0L,
    val giftCount: Long = 0L,
    val visibility: String = "public",
    val updatedAtEpochMs: Long = 0L
)

data class Auction(
    val id: String = "",
    val sellerId: String = "",
    val sellerName: String = "",
    val productId: String = "",
    val productTitle: String = "",
    val productImageKey: String = "",
    val startingBidNaira: Long = 0L,
    val currentBidNaira: Long = 0L,
    val minIncrementNaira: Long = 100L,
    val highestBidderId: String = "",
    val highestBidderName: String = "",
    val bidCount: Long = 0L,
    val endsAtEpochMs: Long = 0L,
    val status: String = "live",
    val visibility: String = "public",
    val winningOrderId: String = "",
    val createdAtEpochMs: Long = 0L,
    val updatedAtEpochMs: Long = 0L
)

data class AuctionBid(
    val id: String = "",
    val auctionId: String = "",
    val bidderId: String = "",
    val bidderName: String = "",
    val amountNaira: Long = 0L,
    val visibility: String = "public",
    val createdAtEpochMs: Long = 0L
)

data class VirtualGift(
    val id: String = "",
    val name: String = "",
    val category: String = "Standard",
    val coinCost: Long = 10L,
    val animationType: String = "spark",
    val colorHex: String = "#F59E0B",
    val enabled: Boolean = true,
    val createdAtEpochMs: Long = 0L,
    val updatedAtEpochMs: Long = 0L
)

data class GiftTransaction(
    val id: String = "",
    val idempotencyKey: String = "",
    val streamId: String = "",
    val senderId: String = "",
    val senderName: String = "",
    val sellerId: String = "",
    val giftId: String = "",
    val giftName: String = "",
    val coinCost: Long = 0L,
    val coinSource: String = "purchased",
    val comboCount: Long = 1L,
    val createdAtEpochMs: Long = 0L
)

data class ShortVideo(
    val id: String = "",
    val sellerId: String = "",
    val sellerName: String = "",
    val sellerVerified: Boolean = false,
    val title: String = "",
    val caption: String = "",
    val videoUrl: String = "",
    val mimeType: String = "",
    val productId: String = "",
    val productTitle: String = "",
    val productPriceNaira: Long = 0L,
    val productStock: Long = 0L,
    val productImageUrl: String = "",
    val coverKey: String = "",
    val category: String = "",
    val likesCount: Long = 0L,
    val commentsCount: Long = 0L,
    val sharesCount: Long = 0L,
    val likedByViewer: Boolean = false,
    val followingSeller: Boolean = false,
    val status: String = "published",
    val createdAtEpochMs: Long = 0L,
    val updatedAtEpochMs: Long = 0L
)

data class VideoComment(
    val id: String = "",
    val videoId: String = "",
    val userId: String = "",
    val userName: String = "",
    val text: String = "",
    val visibility: String = "public",
    val createdAtEpochMs: Long = 0L
)

data class MarketplaceOrder(
    val id: String = "",
    val idempotencyKey: String = "",
    val buyerId: String = "",
    val sellerId: String = "",
    val sellerName: String = "",
    val itemsSummary: String = "",
    val totalNaira: Long = 0L,
    val deliveryState: String = "Lagos",
    val deliveryAddress: String = "",
    val paymentMethod: String = "",
    val paymentReference: String = "",
    val paymentStatus: String = "awaiting_payment",
    val orderStatus: String = "awaiting_payment",
    val fulfilmentStatus: String = "",
    val carrier: String = "",
    val trackingNumber: String = "",
    val sourceType: String = "marketplace",
    val auctionId: String = "",
    val createdAtEpochMs: Long = 0L,
    val updatedAtEpochMs: Long = 0L
)

data class Dispute(
    val id: String = "",
    val reporterId: String = "",
    val targetType: String = "order",
    val targetId: String = "",
    val reason: String = "",
    val status: String = "open",
    val resolutionNote: String = "",
    val createdAtEpochMs: Long = 0L,
    val updatedAtEpochMs: Long = 0L
)

data class AuditLog(
    val id: String = "",
    val adminId: String = "",
    val adminEmail: String = "",
    val action: String = "",
    val targetPath: String = "",
    val summary: String = "",
    val createdAtEpochMs: Long = 0L
)
