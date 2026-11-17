package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.model.AuditLog
import com.example.data.model.Dispute
import com.example.data.model.GiftTransaction
import com.example.data.model.MarketplaceOrder
import com.example.data.model.Product
import com.example.data.repository.AdminRepository
import com.example.data.repository.CatalogRepository
import com.example.data.repository.LiveCommerceRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class SellerAdminViewModel(
    private val catalogRepo: CatalogRepository,
    private val liveRepo: LiveCommerceRepository,
    private val adminRepo: AdminRepository,
    val currentUserId: String,
    val currentUserName: String,
    val currentUserEmail: String
) : ViewModel() {

    val isAdmin: Boolean = false

    val sellerProducts: StateFlow<List<Product>> =
        catalogRepo.observeSellerProducts(currentUserId)
            .catch { emit(emptyList()) }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), emptyList())

    val sellerOrders: StateFlow<List<MarketplaceOrder>> =
        catalogRepo.observeSellerOrders(currentUserId)
            .catch { emit(emptyList()) }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), emptyList())

    val sellerGiftTransactions: StateFlow<List<GiftTransaction>> =
        liveRepo.observeGiftTransactionsForSeller(currentUserId)
            .catch { emit(emptyList()) }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), emptyList())

    val adminDisputes: StateFlow<List<Dispute>> =
        if (isAdmin) {
            adminRepo.observeDisputesForAdmin().catch { emit(emptyList()) }
                .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), emptyList())
        } else {
            flowOf(emptyList<Dispute>())
                .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), emptyList())
        }

    val adminAuditLogs: StateFlow<List<AuditLog>> =
        if (isAdmin) {
            adminRepo.observeAuditLogs().catch { emit(emptyList()) }
                .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), emptyList())
        } else {
            flowOf(emptyList<AuditLog>())
                .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), emptyList())
        }

    private val _feedback = MutableStateFlow<String?>(null)
    val feedback: StateFlow<String?> = _feedback.asStateFlow()

    fun saveStorefront(
        businessName: String,
        tagline: String,
        stateLocation: String,
        themeId: String,
        policies: String
    ) {
        viewModelScope.launch {
            catalogRepo.createOrUpdateSellerStorefront(
                ownerId = currentUserId,
                businessName = businessName,
                tagline = tagline,
                stateLocation = stateLocation,
                themeId = themeId,
                policies = policies
            ).onSuccess {
                _feedback.value = "Storefront saved ($businessName)"
            }.onFailure {
                _feedback.value = it.message ?: "Failed to save storefront"
            }
        }
    }

    fun addProduct(
        sellerName: String,
        title: String,
        description: String,
        category: String,
        brand: String,
        priceNaira: Long,
        stock: Long,
        isFlashDeal: Boolean
    ) {
        viewModelScope.launch {
            catalogRepo.createProductListing(
                sellerId = currentUserId,
                sellerName = sellerName.ifBlank { currentUserName },
                title = title,
                description = description,
                category = category,
                brand = brand,
                priceNaira = priceNaira,
                originalPriceNaira = priceNaira,
                stockCount = stock,
                variants = listOf("Standard"),
                isFlashDeal = isFlashDeal,
                submitForReview = true
            ).onSuccess {
                _feedback.value = "Submitted for moderation review: $title"
            }.onFailure {
                _feedback.value = it.message ?: "Failed to add product"
            }
        }
    }

    fun updateStockAndFlash(product: Product, newPrice: Long, newStock: Long, isFlash: Boolean) {
        viewModelScope.launch {
            catalogRepo.updateProductStockAndPrice(product, newPrice, newStock, isFlash)
                .onSuccess { _feedback.value = "Updated ${product.title} (draft saved for review)" }
                .onFailure { _feedback.value = it.message ?: "Update failed" }
        }
    }

    fun submitProductForReview(product: Product) {
        viewModelScope.launch {
            catalogRepo.submitSellerProductForReview(product)
                .onSuccess { _feedback.value = "${product.title} submitted for moderation" }
                .onFailure { _feedback.value = it.message ?: "Submit failed" }
        }
    }

    fun fulfilOrder(orderId: String, nextStatus: String) {
        viewModelScope.launch {
            catalogRepo.updateOrderStatus(orderId, nextStatus)
                .onSuccess { _feedback.value = "Order $orderId marked $nextStatus" }
                .onFailure { _feedback.value = it.message ?: "Status update failed" }
        }
    }

    fun launchAuction(
        sellerName: String,
        product: Product,
        startingBidNaira: Long,
        minIncrementNaira: Long,
        durationMinutes: Long
    ) {
        viewModelScope.launch {
            liveRepo.createLiveAuction(
                sellerId = currentUserId,
                sellerName = sellerName,
                product = product,
                startingBidNaira = startingBidNaira,
                minIncrementNaira = minIncrementNaira,
                durationMinutes = durationMinutes
            ).onSuccess {
                _feedback.value = "Live auction launched for ${product.title}"
            }.onFailure {
                _feedback.value = it.message ?: "Failed to launch auction"
            }
        }
    }

    fun adminVerifySeller(sellerId: String, verified: Boolean) {
        if (!isAdmin) return
        viewModelScope.launch {
            adminRepo.verifySeller(currentUserId, currentUserEmail, sellerId, verified)
                .onSuccess { _feedback.value = "Seller verification updated & logged" }
                .onFailure { _feedback.value = it.message ?: "Admin verification failed" }
        }
    }

    fun adminModerateProduct(productId: String, status: String) {
        if (!isAdmin) return
        viewModelScope.launch {
            adminRepo.moderateProduct(currentUserId, currentUserEmail, productId, status)
                .onSuccess { _feedback.value = "Product status updated to $status" }
                .onFailure { _feedback.value = it.message ?: "Moderation failed" }
        }
    }

    fun adminSaveGift(giftId: String?, name: String, category: String, cost: Long, animType: String) {
        if (!isAdmin) return
        viewModelScope.launch {
            adminRepo.createOrUpdateVirtualGift(currentUserId, currentUserEmail, giftId, name, category, cost, animType)
                .onSuccess { _feedback.value = "Gift '$name' saved" }
                .onFailure { _feedback.value = it.message ?: "Gift save failed" }
        }
    }

    fun adminResolveDispute(disputeId: String, status: String, note: String) {
        if (!isAdmin) return
        viewModelScope.launch {
            adminRepo.resolveDispute(currentUserId, currentUserEmail, disputeId, status, note)
                .onSuccess { _feedback.value = "Dispute resolved" }
                .onFailure { _feedback.value = it.message ?: "Resolve failed" }
        }
    }

    fun clearFeedback() {
        _feedback.value = null
    }
}
