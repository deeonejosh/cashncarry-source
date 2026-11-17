package com.example.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.model.CartItem
import com.example.data.model.MarketplaceOrder
import com.example.data.model.Product
import com.example.data.model.ProductReview
import com.example.data.model.SellerApplication
import com.example.data.model.SellerStorefront
import com.example.data.model.UiState
import com.example.data.model.UserPrivateInfo
import com.example.data.model.UserProfile
import com.example.data.model.WishlistItem
import com.example.data.remote.CloudflareHealthSnapshot
import com.example.data.remote.CloudflareResult
import com.example.data.remote.CloudflareSessionSnapshot
import com.example.data.remote.CloudflareSyncRepository
import com.example.data.repository.AiRecommendationRepository
import com.example.data.repository.AiSearchAdvice
import com.example.data.repository.CatalogRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

enum class ProductSortOption(val label: String) {
    RECOMMENDED("Recommended"),
    PRICE_LOW_HIGH("Price: Low to High"),
    PRICE_HIGH_LOW("Price: High to Low"),
    TOP_RATED("Top Rated"),
    BEST_SELLING("Best Selling")
}

@OptIn(ExperimentalCoroutinesApi::class)
class MarketplaceViewModel(
    private val catalogRepository: CatalogRepository,
    private val aiRepository: AiRecommendationRepository,
    val currentUserId: String,
    val currentUserName: String,
    val currentUserEmail: String,
    private val cloudflareSyncRepository: CloudflareSyncRepository? = null
) : ViewModel() {

    val productsState: StateFlow<UiState<List<Product>>> =
        catalogRepository.observeActiveProductsState()
            .catch { error -> emit(UiState.Error(unwrapMessage(error, "Failed to load products"))) }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), UiState.Loading)

    val sellersState: StateFlow<UiState<List<SellerStorefront>>> =
        catalogRepository.observeActiveSellersState()
            .catch { error -> emit(UiState.Error(unwrapMessage(error, "Failed to load storefronts"))) }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), UiState.Loading)

    val sellerApplication: StateFlow<SellerApplication?> =
        catalogRepository.observeSellerApplication()
            .catch { emit(null) }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), null)

    val cartState: StateFlow<UiState<List<CartItem>>> =
        catalogRepository.observeCart(currentUserId)
            .let { flow ->
                kotlinx.coroutines.flow.combine(flow, MutableStateFlow(Unit)) { list, _ ->
                    UiState.Success(list) as UiState<List<CartItem>>
                }
            }
            .catch { error -> emit(UiState.Error(unwrapMessage(error, "Failed to load cart"))) }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), UiState.Loading)

    val wishlistState: StateFlow<UiState<List<WishlistItem>>> =
        catalogRepository.observeWishlist(currentUserId)
            .let { flow ->
                kotlinx.coroutines.flow.combine(flow, MutableStateFlow(Unit)) { list, _ ->
                    UiState.Success(list) as UiState<List<WishlistItem>>
                }
            }
            .catch { error -> emit(UiState.Error(unwrapMessage(error, "Failed to load wishlist"))) }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), UiState.Loading)

    val buyerOrdersState: StateFlow<UiState<List<MarketplaceOrder>>> =
        catalogRepository.observeBuyerOrders(currentUserId)
            .let { flow ->
                kotlinx.coroutines.flow.combine(flow, MutableStateFlow(Unit)) { list, _ ->
                    UiState.Success(list) as UiState<List<MarketplaceOrder>>
                }
            }
            .catch { error -> emit(UiState.Error(unwrapMessage(error, "Failed to load orders"))) }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), UiState.Loading)

    val userProfile: StateFlow<UserProfile?> =
        catalogRepository.observeUserProfile(currentUserId)
            .catch { emit(null) }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), null)

    val userPrivateInfo: StateFlow<UserPrivateInfo?> =
        catalogRepository.observeUserPrivateInfo(currentUserId)
            .catch { emit(null) }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), null)

    private val _selectedProductId = MutableStateFlow<String?>(null)
    val selectedProductReviews: StateFlow<List<ProductReview>> =
        _selectedProductId.flatMapLatest { pid ->
            if (pid.isNullOrBlank()) flowOf(emptyList())
            else catalogRepository.observeProductReviews(pid).catch { emit(emptyList()) }
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), emptyList())

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _selectedCategory = MutableStateFlow("All")
    val selectedCategory: StateFlow<String> = _selectedCategory.asStateFlow()

    private val _selectedBrand = MutableStateFlow("All")
    val selectedBrand: StateFlow<String> = _selectedBrand.asStateFlow()

    private val _selectedSellerFilterId = MutableStateFlow<String?>(null)
    val selectedSellerFilterId: StateFlow<String?> = _selectedSellerFilterId.asStateFlow()

    private val _sortOption = MutableStateFlow(ProductSortOption.RECOMMENDED)
    val sortOption: StateFlow<ProductSortOption> = _sortOption.asStateFlow()

    private val _inStockOnly = MutableStateFlow(false)
    val inStockOnly: StateFlow<Boolean> = _inStockOnly.asStateFlow()

    private val _deliveryStateFilterEnabled = MutableStateFlow(false)
    val deliveryStateFilterEnabled: StateFlow<Boolean> = _deliveryStateFilterEnabled.asStateFlow()

    private val _compareProductIds = MutableStateFlow<List<String>>(emptyList())
    val compareProductIds: StateFlow<List<String>> = _compareProductIds.asStateFlow()

    private val _aiAdviceState = MutableStateFlow<UiState<AiSearchAdvice>?>(null)
    val aiAdviceState: StateFlow<UiState<AiSearchAdvice>?> = _aiAdviceState.asStateFlow()

    private val _actionMessage = MutableStateFlow<String?>(null)
    val actionMessage: StateFlow<String?> = _actionMessage.asStateFlow()

    private val _isSubmittingSellerApp = MutableStateFlow(false)
    val isSubmittingSellerApp: StateFlow<Boolean> = _isSubmittingSellerApp.asStateFlow()

    private val _cloudflareHealth = MutableStateFlow(CloudflareHealthSnapshot())
    val cloudflareHealth: StateFlow<CloudflareHealthSnapshot> = _cloudflareHealth.asStateFlow()

    private val _cloudflareSession = MutableStateFlow(
        cloudflareSyncRepository?.currentSessionSnapshot() ?: CloudflareSessionSnapshot()
    )
    val cloudflareSession: StateFlow<CloudflareSessionSnapshot> = _cloudflareSession.asStateFlow()

    init {
        refreshMarketplace()
    }

    fun refreshMarketplace() {
        viewModelScope.launch {
            catalogRepository.ensureUserInitialized(currentUserId, currentUserName, currentUserEmail)
            cloudflareSyncRepository?.let { sync ->
                _cloudflareHealth.value = sync.fetchHealth()
                _cloudflareSession.value = sync.currentSessionSnapshot()
            }
        }
    }

    fun refreshCloudflareSync() {
        refreshMarketplace()
    }

    fun signInCloudflareAccount(email: String, password: String) {
        val sync = cloudflareSyncRepository ?: return
        viewModelScope.launch {
            when (val res = sync.signInWithPassword(email, password)) {
                is CloudflareResult.Success -> {
                    _cloudflareSession.value = res.data
                    _actionMessage.value = "Signed in as ${res.data.email}"
                    refreshMarketplace()
                }
                is CloudflareResult.Failure -> {
                    _actionMessage.value = res.message
                }
            }
        }
    }

    fun signOutCloudflareAccount() {
        val sync = cloudflareSyncRepository ?: return
        viewModelScope.launch {
            sync.signOut()
            _cloudflareSession.value = sync.currentSessionSnapshot()
            _actionMessage.value = "Signed out of Cash N Carry"
        }
    }

    fun submitSellerApplication(
        businessName: String,
        cacNumber: String,
        businessType: String,
        stateLocation: String,
        phone: String,
        description: String,
        onSubmitted: () -> Unit = {}
    ) {
        if (currentUserId.isBlank()) {
            _actionMessage.value = "Please sign in first to apply as a seller."
            return
        }
        viewModelScope.launch {
            _isSubmittingSellerApp.value = true
            catalogRepository.submitSellerApplication(
                userId = currentUserId,
                businessName = businessName,
                cacNumber = cacNumber,
                businessType = businessType,
                stateLocation = stateLocation,
                phone = phone,
                description = description
            ).onSuccess {
                _actionMessage.value = "Application submitted! Your seller account is awaiting admin approval."
                refreshMarketplace()
                onSubmitted()
            }.onFailure {
                _actionMessage.value = it.message ?: "Could not submit seller application."
            }
            _isSubmittingSellerApp.value = false
        }
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setCategory(category: String) {
        _selectedCategory.value = category
    }

    fun setBrand(brand: String) {
        _selectedBrand.value = brand
    }

    fun setSellerFilter(sellerId: String?) {
        _selectedSellerFilterId.value = sellerId
    }

    fun setSortOption(option: ProductSortOption) {
        _sortOption.value = option
    }

    fun toggleInStockOnly() {
        _inStockOnly.value = !_inStockOnly.value
    }

    fun toggleDeliveryStateFilter() {
        _deliveryStateFilterEnabled.value = !_deliveryStateFilterEnabled.value
    }

    fun toggleCompareProduct(productId: String) {
        val current = _compareProductIds.value
        _compareProductIds.value = if (current.contains(productId)) {
            current - productId
        } else {
            (current + productId).takeLast(3)
        }
    }

    fun selectProductForDetail(productId: String) {
        _selectedProductId.value = productId
        viewModelScope.launch {
            catalogRepository.loadProductReviews(productId)
            val recent = userProfile.value?.recentProductIds ?: emptyList()
            catalogRepository.recordRecentlyViewed(currentUserId, recent, productId)
        }
    }

    fun updateNigerianState(state: String) {
        viewModelScope.launch {
            catalogRepository.updateSelectedState(currentUserId, state)
                .onSuccess { _actionMessage.value = "Delivery location set to $state" }
                .onFailure { _actionMessage.value = it.message ?: "Failed to update state" }
        }
    }

    fun updateUserProfile(displayName: String, bio: String, avatarKey: String) {
        if (currentUserId.isBlank()) {
            _actionMessage.value = "Sign in to edit your profile."
            return
        }
        viewModelScope.launch {
            catalogRepository.updateUserProfileDetails(currentUserId, displayName, bio, avatarKey)
                .onSuccess { _actionMessage.value = "Profile saved" }
                .onFailure { _actionMessage.value = it.message ?: "Failed to update profile" }
        }
    }

    fun runAiSearchAdvice(queryOverride: String? = null) {
        val q = (queryOverride ?: _searchQuery.value).trim()
        if (q.isBlank()) return
        val catalog = (productsState.value as? UiState.Success)?.data ?: emptyList()
        val state = userProfile.value?.selectedState ?: "Lagos"
        val recent = userProfile.value?.recentProductIds ?: emptyList()

        viewModelScope.launch {
            _aiAdviceState.value = UiState.Loading
            aiRepository.getSearchRecommendations(q, state, catalog, recent)
                .onSuccess { advice -> _aiAdviceState.value = UiState.Success(advice) }
                .onFailure { e -> _aiAdviceState.value = UiState.Error(e.message ?: "Search failed") }
        }
    }

    fun addToCart(product: Product, variant: String, quantity: Long = 1L) {
        if (currentUserId.isBlank()) {
            _actionMessage.value = "Please sign in to add items to your cart."
            return
        }
        viewModelScope.launch {
            catalogRepository.addToCart(currentUserId, product, variant, quantity)
                .onSuccess { _actionMessage.value = "Added ${product.title} to cart" }
                .onFailure { _actionMessage.value = it.message ?: "Could not add to cart" }
        }
    }

    fun updateCartQuantity(cartItemId: String, newQty: Long) {
        if (currentUserId.isBlank()) return
        viewModelScope.launch {
            catalogRepository.updateCartQuantity(currentUserId, cartItemId, newQty)
                .onFailure { _actionMessage.value = it.message ?: "Could not update cart" }
        }
    }

    fun toggleWishlist(product: Product) {
        if (currentUserId.isBlank()) {
            _actionMessage.value = "Please sign in to save items."
            return
        }
        val isSaved = (wishlistState.value as? UiState.Success)?.data?.any { it.productId == product.id } == true
        viewModelScope.launch {
            catalogRepository.toggleWishlist(currentUserId, product, isSaved)
                .onSuccess { added ->
                    _actionMessage.value = if (added) "Saved to wishlist" else "Removed from wishlist"
                }
                .onFailure { _actionMessage.value = it.message ?: "Wishlist update failed" }
        }
    }

    fun toggleFollowSeller(sellerId: String) {
        if (currentUserId.isBlank()) {
            _actionMessage.value = "Please sign in to follow sellers."
            return
        }
        val following = userProfile.value?.followingSellerIds ?: emptyList()
        viewModelScope.launch {
            catalogRepository.toggleFollowSeller(currentUserId, sellerId, following)
                .onSuccess { followed ->
                    _actionMessage.value = if (followed) "Following seller" else "Unfollowed seller"
                }
                .onFailure { _actionMessage.value = it.message ?: "Follow update failed" }
        }
    }

    fun submitReview(productId: String, rating: Long, comment: String) {
        if (currentUserId.isBlank()) {
            _actionMessage.value = "Please sign in to leave a review."
            return
        }
        if (comment.isBlank()) return
        viewModelScope.launch {
            catalogRepository.submitReview(currentUserId, currentUserName, productId, rating, comment)
                .onSuccess { _actionMessage.value = "Review published" }
                .onFailure { _actionMessage.value = it.message ?: "Failed to publish review" }
        }
    }

    fun saveShippingSetup(phone: String, address: String, state: String) {
        if (currentUserId.isBlank()) {
            _actionMessage.value = "Please sign in to save delivery addresses."
            return
        }
        viewModelScope.launch {
            catalogRepository.saveShippingAndPaymentSetup(currentUserId, phone, address, state)
                .onSuccess { _actionMessage.value = "Delivery address saved" }
                .onFailure { _actionMessage.value = it.message ?: "Failed to save address" }
        }
    }

    fun checkoutCart(
        deliveryState: String,
        deliveryAddress: String,
        paymentMethod: String,
        onComplete: (List<String>) -> Unit
    ) {
        if (currentUserId.isBlank()) {
            _actionMessage.value = "Please sign in to checkout."
            return
        }
        val items = (cartState.value as? UiState.Success)?.data ?: emptyList()
        if (items.isEmpty()) return
        viewModelScope.launch {
            catalogRepository.checkoutCartWithFlutterwave(
                userId = currentUserId,
                cartItems = items,
                deliveryState = deliveryState,
                deliveryAddress = deliveryAddress,
                paymentMethod = paymentMethod
            ).onSuccess { orderIds ->
                _actionMessage.value = "Order confirmed (${orderIds.firstOrNull().orEmpty()})."
                onComplete(orderIds)
            }.onFailure {
                _actionMessage.value = it.message ?: "Checkout failed"
            }
        }
    }

    fun payOrder(orderId: String, paymentMethod: String) {
        viewModelScope.launch {
            catalogRepository.payExistingOrderWithFlutterwave(orderId, paymentMethod)
                .onSuccess { ref -> _actionMessage.value = "Payment link ready ($ref)" }
                .onFailure { _actionMessage.value = it.message ?: "Payments are currently disabled." }
        }
    }

    fun showInfoMessage(message: String) {
        _actionMessage.value = message
    }

    fun clearMessage() {
        _actionMessage.value = null
    }

    private fun unwrapMessage(error: Throwable, fallback: String): String {
        if (error is CancellationException) throw error
        Log.w(TAG, fallback, error)
        return error.message ?: fallback
    }

    private companion object {
        const val TAG = "MarketplaceVM"
    }
}
