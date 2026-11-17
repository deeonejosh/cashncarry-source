package com.example.data.repository

import com.example.data.model.BuyerAddress
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
import com.example.data.remote.CloudflareResult
import com.example.data.remote.CloudflareSyncRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import java.util.UUID

class CatalogRepository(
    private val syncRepo: CloudflareSyncRepository? = null
) {
    private val _products = MutableStateFlow<List<Product>>(emptyList())
    private val _productsError = MutableStateFlow<String?>(null)
    private val _productsLoaded = MutableStateFlow(false)

    private val _sellers = MutableStateFlow<List<SellerStorefront>>(emptyList())
    private val _sellersError = MutableStateFlow<String?>(null)
    private val _sellersLoaded = MutableStateFlow(false)

    private val _sellerOwnProducts = MutableStateFlow<List<Product>>(emptyList())
    private val _sellerOrders = MutableStateFlow<List<MarketplaceOrder>>(emptyList())
    private val _sellerApplication = MutableStateFlow<SellerApplication?>(null)

    private val _reviewsByProduct = MutableStateFlow<Map<String, List<ProductReview>>>(emptyMap())
    private val _profilesByUser = MutableStateFlow<Map<String, UserProfile>>(emptyMap())
    private val _privateInfoByUser = MutableStateFlow<Map<String, UserPrivateInfo>>(emptyMap())
    private val _addresses = MutableStateFlow<List<BuyerAddress>>(emptyList())
    private val _cartByUser = MutableStateFlow<Map<String, List<CartItem>>>(emptyMap())
    private val _wishlistByUser = MutableStateFlow<Map<String, List<WishlistItem>>>(emptyMap())
    private val _orders = MutableStateFlow<List<MarketplaceOrder>>(emptyList())

    fun observeActiveProductsState(): Flow<UiState<List<Product>>> =
        combine(_products, _productsError, _productsLoaded) { list, err, loaded ->
            when {
                err != null && !loaded -> UiState.Error(err)
                err != null && list.isEmpty() -> UiState.Error(err)
                !loaded -> UiState.Loading
                else -> UiState.Success(list.filter { it.status == "active" })
            }
        }

    fun observeActiveSellersState(): Flow<UiState<List<SellerStorefront>>> =
        combine(_sellers, _sellersError, _sellersLoaded) { list, err, loaded ->
            when {
                err != null && !loaded -> UiState.Error(err)
                err != null && list.isEmpty() -> UiState.Error(err)
                !loaded -> UiState.Loading
                else -> UiState.Success(list.filter { it.status == "active" })
            }
        }

    fun observeActiveProducts(): Flow<List<Product>> =
        _products.map { list -> list.filter { it.status == "active" } }

    fun observeSellerProducts(sellerId: String): Flow<List<Product>> =
        _sellerOwnProducts.map { list ->
            if (list.isNotEmpty()) list else _products.value.filter { it.sellerId == sellerId }
        }

    fun observeActiveSellers(): Flow<List<SellerStorefront>> =
        _sellers.map { list -> list.filter { it.status == "active" } }

    fun observeSellerApplication(): Flow<SellerApplication?> = _sellerApplication

    fun observeProductReviews(productId: String): Flow<List<ProductReview>> =
        _reviewsByProduct.map { map -> map[productId].orEmpty().filter { it.visibility == "public" } }

    fun observeUserProfile(userId: String): Flow<UserProfile?> =
        _profilesByUser.map { it[userId] }

    fun observeUserPrivateInfo(userId: String): Flow<UserPrivateInfo?> =
        _privateInfoByUser.map { it[userId] }

    fun observeCart(userId: String): Flow<List<CartItem>> =
        _cartByUser.map { it[userId].orEmpty() }

    fun observeWishlist(userId: String): Flow<List<WishlistItem>> =
        _wishlistByUser.map { it[userId].orEmpty() }

    fun observeBuyerOrders(buyerId: String): Flow<List<MarketplaceOrder>> =
        _orders.map { list -> list.filter { it.buyerId == buyerId }.sortedByDescending { it.createdAtEpochMs } }

    fun observeSellerOrders(sellerId: String): Flow<List<MarketplaceOrder>> =
        _sellerOrders.map { list -> list.sortedByDescending { it.createdAtEpochMs } }

    suspend fun ensureUserInitialized(
        userId: String,
        displayName: String,
        email: String
    ): Result<Unit> = runCatching {
        val now = System.currentTimeMillis()
        val snap = syncRepo?.currentSessionSnapshot()
        if (userId.isNotBlank()) {
            val profile = UserProfile(
                id = userId,
                userId = userId,
                displayName = snap?.displayName?.ifBlank { displayName } ?: displayName.ifBlank { "Shopper" },
                bio = snap?.bio.orEmpty(),
                selectedState = snap?.selectedState?.ifBlank { "Lagos" } ?: "Lagos",
                role = snap?.role ?: "buyer",
                sellerStatus = snap?.sellerStatus ?: "none",
                verified = snap?.verified ?: false,
                suspended = snap?.suspended ?: false,
                createdAtEpochMs = now,
                updatedAtEpochMs = now
            )
            _profilesByUser.value = _profilesByUser.value + (userId to profile)

            if (_privateInfoByUser.value[userId] == null) {
                _privateInfoByUser.value = _privateInfoByUser.value + (
                    userId to UserPrivateInfo(
                        id = userId,
                        userId = userId,
                        email = email.take(160),
                        shippingState = snap?.selectedState?.ifBlank { "Lagos" } ?: "Lagos",
                        createdAtEpochMs = now,
                        updatedAtEpochMs = now
                    )
                )
            }
        }
        syncFromServer(userId)
        Unit
    }

    suspend fun syncFromServer(userId: String) {
        val remote = syncRepo ?: return
        when (val prodRes = remote.fetchCatalogProducts()) {
            is CloudflareResult.Success -> {
                _products.value = prodRes.data
                _productsError.value = null
                _productsLoaded.value = true
            }
            is CloudflareResult.Failure -> {
                _productsError.value = prodRes.message
                if (!_productsLoaded.value) _productsLoaded.value = true
            }
        }

        when (val sellerRes = remote.fetchStorefronts()) {
            is CloudflareResult.Success -> {
                _sellers.value = sellerRes.data
                _sellersError.value = null
                _sellersLoaded.value = true
            }
            is CloudflareResult.Failure -> {
                _sellersError.value = sellerRes.message
                if (!_sellersLoaded.value) _sellersLoaded.value = true
            }
        }

        if (userId.isBlank() || !remote.currentSessionSnapshot().signedIn) {
            return
        }

        when (val profRes = remote.fetchProfile()) {
            is CloudflareResult.Success -> {
                val cur = _profilesByUser.value[userId] ?: UserProfile(id = userId, userId = userId)
                _profilesByUser.value = _profilesByUser.value + (
                    userId to cur.copy(
                        displayName = profRes.data.displayName.ifBlank { cur.displayName },
                        bio = profRes.data.bio.ifBlank { cur.bio },
                        selectedState = profRes.data.selectedState.ifBlank { cur.selectedState },
                        role = profRes.data.role,
                        sellerStatus = profRes.data.sellerStatus,
                        verified = profRes.data.verified,
                        suspended = profRes.data.suspended
                    )
                )
            }
            is CloudflareResult.Failure -> Unit
        }

        when (val appRes = remote.fetchSellerApplication()) {
            is CloudflareResult.Success -> {
                _sellerApplication.value = appRes.data.second
            }
            is CloudflareResult.Failure -> Unit
        }

        if (remote.currentSessionSnapshot().isApprovedSeller) {
            when (val ownProd = remote.fetchSellerProducts()) {
                is CloudflareResult.Success -> _sellerOwnProducts.value = ownProd.data
                is CloudflareResult.Failure -> Unit
            }
            when (val ownOrders = remote.fetchSellerOrders()) {
                is CloudflareResult.Success -> _sellerOrders.value = ownOrders.data
                is CloudflareResult.Failure -> Unit
            }
        } else {
            _sellerOwnProducts.value = emptyList()
            _sellerOrders.value = emptyList()
        }

        when (val addrRes = remote.fetchAddresses()) {
            is CloudflareResult.Success -> {
                _addresses.value = addrRes.data
                val first = addrRes.data.firstOrNull()
                if (first != null) {
                    val existing = _privateInfoByUser.value[userId] ?: UserPrivateInfo(id = userId, userId = userId)
                    _privateInfoByUser.value = _privateInfoByUser.value + (
                        userId to existing.copy(
                            phone = first.phone,
                            shippingAddress = "${first.line}, ${first.city}",
                            shippingState = first.state,
                            addressId = first.id,
                            savedPaymentReady = true,
                            updatedAtEpochMs = System.currentTimeMillis()
                        )
                    )
                }
            }
            is CloudflareResult.Failure -> Unit
        }

        when (val cartRes = remote.fetchCart()) {
            is CloudflareResult.Success -> {
                val byId = _products.value.associateBy { it.id }
                val saved = cartRes.data.map { row ->
                    val product = byId[row.productId]
                    if (product == null) row else row.copy(
                        sellerId = product.sellerId,
                        sellerName = product.sellerName,
                        productTitle = product.title,
                        imageKey = product.imageKey,
                        unitPriceNaira = product.priceNaira
                    )
                }
                _cartByUser.value = _cartByUser.value + (userId to saved)
            }
            is CloudflareResult.Failure -> Unit
        }

        when (val wishRes = remote.fetchWishlist()) {
            is CloudflareResult.Success -> {
                val productById = _products.value.associateBy { it.id }
                val saved = wishRes.data.map { item ->
                    val real = productById[item.productId]
                    if (real == null) item else item.copy(
                        productTitle = real.title,
                        priceNaira = real.priceNaira,
                        sellerName = real.sellerName,
                        imageKey = real.imageKey
                    )
                }
                _wishlistByUser.value = _wishlistByUser.value + (userId to saved)
            }
            is CloudflareResult.Failure -> Unit
        }

        when (val followRes = remote.fetchFollows()) {
            is CloudflareResult.Success -> {
                val cur = _profilesByUser.value[userId] ?: UserProfile(id = userId, userId = userId)
                _profilesByUser.value = _profilesByUser.value + (
                    userId to cur.copy(followingSellerIds = followRes.data)
                )
            }
            is CloudflareResult.Failure -> Unit
        }

        when (val orderRes = remote.fetchOrders()) {
            is CloudflareResult.Success -> _orders.value = orderRes.data
            is CloudflareResult.Failure -> Unit
        }
    }

    suspend fun loadProductReviews(productId: String) {
        val remote = syncRepo ?: return
        when (val res = remote.fetchProductReviews(productId)) {
            is CloudflareResult.Success -> {
                _reviewsByProduct.value = _reviewsByProduct.value + (productId to res.data)
            }
            is CloudflareResult.Failure -> Unit
        }
    }

    suspend fun submitSellerApplication(
        userId: String,
        businessName: String,
        cacNumber: String,
        businessType: String,
        stateLocation: String,
        phone: String,
        description: String
    ): Result<SellerApplication> = runCatching {
        val remote = syncRepo ?: throw IllegalStateException("Server connection required to submit seller application.")
        when (val res = remote.submitSellerApplication(businessName, cacNumber, businessType, stateLocation, phone, description)) {
            is CloudflareResult.Failure -> throw IllegalStateException(res.message)
            is CloudflareResult.Success -> {
                _sellerApplication.value = res.data
                val cur = _profilesByUser.value[userId] ?: UserProfile(id = userId, userId = userId)
                _profilesByUser.value = _profilesByUser.value + (userId to cur.copy(sellerStatus = "pending"))
                res.data
            }
        }
    }

    suspend fun updateUserProfileDetails(
        userId: String,
        displayName: String,
        bio: String,
        avatarKey: String
    ): Result<Unit> = runCatching {
        val current = _profilesByUser.value[userId] ?: UserProfile(id = userId, userId = userId)
        val cleanName = displayName.trim().ifBlank { "Shopper" }.take(80)
        val cleanBio = bio.trim().take(240)
        val cleanAvatar = avatarKey.trim().take(400)
        val remote = syncRepo ?: throw IllegalStateException("Sign in to save your profile.")
        when (val saved = remote.updateProfile(
            displayName = cleanName,
            bio = cleanBio,
            avatarUrl = cleanAvatar,
            selectedState = current.selectedState
        )) {
            is CloudflareResult.Failure -> throw IllegalStateException(saved.message)
            is CloudflareResult.Success -> Unit
        }
        _profilesByUser.value = _profilesByUser.value + (
            userId to current.copy(
                displayName = cleanName,
                bio = cleanBio,
                avatarKey = cleanAvatar,
                updatedAtEpochMs = System.currentTimeMillis()
            )
        )
        Unit
    }

    suspend fun updateSelectedState(userId: String, state: String): Result<Unit> = runCatching {
        val current = _profilesByUser.value[userId] ?: UserProfile(id = userId, userId = userId)
        if (userId.isNotBlank() && syncRepo?.currentSessionSnapshot()?.signedIn == true) {
            when (val saved = syncRepo.updateProfile(
                displayName = current.displayName.ifBlank { "Shopper" },
                bio = current.bio,
                avatarUrl = current.avatarKey,
                selectedState = state
            )) {
                is CloudflareResult.Failure -> throw IllegalStateException(saved.message)
                is CloudflareResult.Success -> Unit
            }
        }
        _profilesByUser.value = _profilesByUser.value + (
            userId to current.copy(selectedState = state, updatedAtEpochMs = System.currentTimeMillis())
        )
        Unit
    }

    suspend fun recordRecentlyViewed(
        userId: String,
        currentRecent: List<String>,
        productId: String
    ): Result<Unit> = runCatching {
        if (userId.isBlank()) return@runCatching
        val updated = (listOf(productId) + currentRecent.filterNot { it == productId }).take(12)
        val current = _profilesByUser.value[userId] ?: UserProfile(id = userId, userId = userId)
        _profilesByUser.value = _profilesByUser.value + (
            userId to current.copy(recentProductIds = updated, updatedAtEpochMs = System.currentTimeMillis())
        )
        Unit
    }

    suspend fun toggleFollowSeller(
        userId: String,
        sellerId: String,
        currentlyFollowing: List<String>
    ): Result<Boolean> = runCatching {
        val remote = syncRepo ?: throw IllegalStateException("Please sign in to follow sellers.")
        val rawOwnerId = sellerId.removePrefix("seller_")
        val isFollowing = currentlyFollowing.contains(rawOwnerId) || currentlyFollowing.contains(sellerId)
        val updated = if (isFollowing) {
            currentlyFollowing.filterNot { it == rawOwnerId || it == sellerId }
        } else {
            (currentlyFollowing + rawOwnerId).distinct().take(190)
        }
        when (val result = remote.toggleFollowSeller(rawOwnerId)) {
            is CloudflareResult.Failure -> throw IllegalStateException(result.message)
            is CloudflareResult.Success -> Unit
        }
        val current = _profilesByUser.value[userId] ?: UserProfile(id = userId, userId = userId)
        _profilesByUser.value = _profilesByUser.value + (
            userId to current.copy(followingSellerIds = updated, updatedAtEpochMs = System.currentTimeMillis())
        )
        _sellers.value = _sellers.value.map { seller ->
            if (seller.id == sellerId || seller.ownerId == rawOwnerId) {
                val delta = if (isFollowing) -1L else 1L
                seller.copy(followersCount = (seller.followersCount + delta).coerceAtLeast(0L))
            } else {
                seller
            }
        }
        !isFollowing
    }

    suspend fun saveShippingAndPaymentSetup(
        userId: String,
        phone: String,
        address: String,
        state: String
    ): Result<Unit> = runCatching {
        val remote = syncRepo ?: throw IllegalStateException("Server connection required to save delivery address.")
        val recipient = _profilesByUser.value[userId]?.displayName?.ifBlank { "Buyer" } ?: "Buyer"
        val cleanLine = address.trim()
        require(cleanLine.length >= 4) { "Enter a valid street address." }
        when (val res = remote.saveAddress(
            recipient = recipient,
            phone = phone.trim(),
            line = cleanLine,
            city = state,
            state = state
        )) {
            is CloudflareResult.Failure -> throw IllegalStateException(res.message)
            is CloudflareResult.Success -> {
                val savedAddr = res.data
                _addresses.value = listOf(savedAddr) + _addresses.value
                val existing = _privateInfoByUser.value[userId] ?: UserPrivateInfo(id = userId, userId = userId)
                _privateInfoByUser.value = _privateInfoByUser.value + (
                    userId to existing.copy(
                        phone = savedAddr.phone,
                        shippingAddress = savedAddr.line,
                        shippingState = savedAddr.state,
                        addressId = savedAddr.id,
                        savedPaymentReady = true,
                        updatedAtEpochMs = System.currentTimeMillis()
                    )
                )
            }
        }
        Unit
    }

    suspend fun addToCart(
        userId: String,
        product: Product,
        variantLabel: String,
        quantity: Long = 1L
    ): Result<Unit> = runCatching {
        val remote = syncRepo ?: throw IllegalStateException("Please sign in to add items to your cart.")
        val docId = "${product.id}_${variantLabel.replace(Regex("[^a-zA-Z0-9_-]"), "_")}".take(120)
        val currentCart = _cartByUser.value[userId].orEmpty().toMutableList()
        val existingIdx = currentCart.indexOfFirst { it.id == docId }
        val now = System.currentTimeMillis()
        if (existingIdx >= 0) {
            val prev = currentCart[existingIdx]
            currentCart[existingIdx] = prev.copy(
                quantity = (prev.quantity + quantity).coerceAtMost(99L),
                unitPriceNaira = product.priceNaira,
                updatedAtEpochMs = now
            )
        } else {
            currentCart.add(
                CartItem(
                    id = docId,
                    userId = userId,
                    productId = product.id,
                    sellerId = product.sellerId,
                    sellerName = product.sellerName,
                    productTitle = product.title,
                    variantLabel = variantLabel.ifBlank { "Standard" },
                    unitPriceNaira = product.priceNaira,
                    quantity = quantity.coerceIn(1L, 99L),
                    imageKey = product.imageKey,
                    createdAtEpochMs = now,
                    updatedAtEpochMs = now
                )
            )
        }
        val savedQty = currentCart.first { it.id == docId }.quantity.toInt()
        when (val result = remote.updateCart(product.id, savedQty, source = "mobile")) {
            is CloudflareResult.Failure -> throw IllegalStateException(result.message)
            is CloudflareResult.Success -> if (!result.data) throw IllegalStateException("Cart not saved")
        }
        _cartByUser.value = _cartByUser.value + (userId to currentCart)
        Unit
    }

    suspend fun updateCartQuantity(userId: String, cartItemId: String, newQty: Long): Result<Unit> = runCatching {
        val currentCart = _cartByUser.value[userId].orEmpty()
        val target = currentCart.find { it.id == cartItemId }
        val updated = if (newQty <= 0L) {
            currentCart.filterNot { it.id == cartItemId }
        } else {
            currentCart.map {
                if (it.id == cartItemId) it.copy(quantity = newQty.coerceAtMost(99L)) else it
            }
        }
        val item = target ?: throw IllegalStateException("Cart item not found")
        val remote = syncRepo ?: throw IllegalStateException("Sign in to update your cart")
        when (val result = remote.updateCart(item.productId, newQty.toInt().coerceIn(0, 99), source = "mobile")) {
            is CloudflareResult.Failure -> throw IllegalStateException(result.message)
            is CloudflareResult.Success -> if (!result.data) throw IllegalStateException("Cart not saved")
        }
        _cartByUser.value = _cartByUser.value + (userId to updated)
        Unit
    }

    suspend fun toggleWishlist(userId: String, product: Product, isSaved: Boolean): Result<Boolean> = runCatching {
        val remote = syncRepo ?: throw IllegalStateException("Please sign in to save wishlist items.")
        when (val result = remote.toggleWishlist(product.id)) {
            is CloudflareResult.Failure -> throw IllegalStateException(result.message)
            is CloudflareResult.Success -> Unit
        }
        val current = _wishlistByUser.value[userId].orEmpty()
        val next = if (isSaved) {
            current.filterNot { it.productId == product.id }
        } else {
            current + WishlistItem(
                id = product.id,
                userId = userId,
                productId = product.id,
                productTitle = product.title,
                priceNaira = product.priceNaira,
                sellerName = product.sellerName,
                imageKey = product.imageKey,
                createdAtEpochMs = System.currentTimeMillis()
            )
        }
        _wishlistByUser.value = _wishlistByUser.value + (userId to next)
        !isSaved
    }

    suspend fun submitReview(
        userId: String,
        userName: String,
        productId: String,
        rating: Long,
        comment: String
    ): Result<Unit> = runCatching {
        val remote = syncRepo ?: throw IllegalStateException("Please sign in to submit product reviews.")
        when (val result = remote.submitReview(productId, rating, comment)) {
            is CloudflareResult.Failure -> throw IllegalStateException(result.message)
            is CloudflareResult.Success -> Unit
        }
        val review = ProductReview(
            id = "rev_${UUID.randomUUID().toString().take(10)}",
            productId = productId,
            userId = userId,
            userName = userName.ifBlank { "Verified Buyer" },
            rating = rating.coerceIn(1L, 5L),
            comment = comment.trim().take(500),
            visibility = "public",
            createdAtEpochMs = System.currentTimeMillis()
        )
        val cur = _reviewsByProduct.value[productId].orEmpty()
        _reviewsByProduct.value = _reviewsByProduct.value + (productId to (listOf(review) + cur))
        Unit
    }

    suspend fun checkoutCartWithFlutterwave(
        userId: String,
        cartItems: List<CartItem>,
        deliveryState: String,
        deliveryAddress: String,
        paymentMethod: String,
        sourceType: String = "marketplace"
    ): Result<List<String>> = runCatching {
        require(cartItems.isNotEmpty()) { "Cart is empty" }
        val remote = syncRepo ?: throw IllegalStateException("Please sign in to place orders.")
        val addressId = _privateInfoByUser.value[userId]?.addressId?.ifBlank { _addresses.value.firstOrNull()?.id }
            ?: deliveryAddress.takeIf { it.isNotBlank() }
            ?: throw IllegalStateException("Please save a delivery address before checkout.")
        val idemReq = "req_${UUID.randomUUID().toString().take(12)}"
        when (val orderRes = remote.checkoutCart(idemReq, addressId)) {
            is CloudflareResult.Failure -> throw IllegalStateException(orderRes.message)
            is CloudflareResult.Success -> {
                _cartByUser.value = _cartByUser.value + (userId to emptyList())
                listOf(orderRes.data)
            }
        }
    }

    suspend fun payExistingOrderWithFlutterwave(
        orderId: String,
        paymentMethod: String
    ): Result<String> = runCatching {
        val sync = syncRepo ?: throw IllegalStateException("Payments unavailable offline")
        when (val initRes = sync.initializePayment(orderId)) {
            is CloudflareResult.Failure -> throw IllegalStateException(initRes.message)
            is CloudflareResult.Success -> initRes.data
        }
    }

    suspend fun createOrUpdateSellerStorefront(
        ownerId: String,
        businessName: String,
        tagline: String,
        stateLocation: String,
        themeId: String,
        policies: String
    ): Result<String> = runCatching {
        val remote = syncRepo ?: throw IllegalStateException("Seller Centre requires server connectivity")
        when (val storeSaved = remote.saveSellerStore(businessName.trim(), tagline.trim(), stateLocation)) {
            is CloudflareResult.Failure -> throw IllegalStateException(storeSaved.message)
            is CloudflareResult.Success -> if (!storeSaved.data) throw IllegalStateException("Store not saved")
        }
        val now = System.currentTimeMillis()
        val updated = SellerStorefront(
            id = ownerId,
            ownerId = ownerId,
            businessName = businessName.trim().take(100),
            tagline = tagline.trim().take(200),
            stateLocation = stateLocation,
            themeId = themeId,
            policies = policies.trim().take(1000),
            verified = true,
            status = "active",
            createdAtEpochMs = now,
            updatedAtEpochMs = now
        )
        val without = _sellers.value.filterNot { it.ownerId == ownerId || it.id == ownerId }
        _sellers.value = listOf(updated) + without
        ownerId
    }

    suspend fun createProductListing(
        sellerId: String,
        sellerName: String,
        title: String,
        description: String,
        category: String,
        brand: String,
        priceNaira: Long,
        originalPriceNaira: Long,
        stockCount: Long,
        variants: List<String>,
        isFlashDeal: Boolean,
        imageKey: String = "",
        submitForReview: Boolean = false
    ): Result<String> = runCatching {
        val id = UUID.randomUUID().toString()
        val remote = syncRepo ?: throw IllegalStateException("Product drafts require server connectivity")
        when (
            val saved = remote.createSellerProductDraft(
                id = id,
                name = title.trim(),
                description = description.trim(),
                category = category,
                brand = brand,
                priceNaira = priceNaira,
                compareAtNaira = originalPriceNaira,
                stock = stockCount,
                submitForReview = submitForReview
            )
        ) {
            is CloudflareResult.Failure -> throw IllegalStateException(saved.message)
            is CloudflareResult.Success -> {
                _sellerOwnProducts.value = listOf(saved.data) + _sellerOwnProducts.value
                saved.data.id
            }
        }
    }

    suspend fun updateProductStockAndPrice(
        product: Product,
        newPriceNaira: Long,
        newStock: Long,
        isFlashDeal: Boolean
    ): Result<Unit> = runCatching {
        val remote = syncRepo ?: throw IllegalStateException("Product updates require server connectivity")
        when (
            val res = remote.updateSellerProduct(
                id = product.id,
                revision = product.revision,
                name = product.title,
                description = product.description,
                category = product.category.ifBlank { "electronics" },
                brand = product.brand,
                priceNaira = newPriceNaira,
                compareAtNaira = product.originalPriceNaira,
                stock = newStock
            )
        ) {
            is CloudflareResult.Failure -> throw IllegalStateException(res.message)
            is CloudflareResult.Success -> {
                _sellerOwnProducts.value = _sellerOwnProducts.value.map {
                    if (it.id == product.id) res.data else it
                }
            }
        }
        Unit
    }

    suspend fun submitSellerProductForReview(product: Product): Result<Unit> = runCatching {
        val remote = syncRepo ?: throw IllegalStateException("Server connectivity required")
        when (val res = remote.changeSellerProductPublication("submit", product.id, product.revision)) {
            is CloudflareResult.Failure -> throw IllegalStateException(res.message)
            is CloudflareResult.Success -> {
                _sellerOwnProducts.value = _sellerOwnProducts.value.map {
                    if (it.id == product.id) it.copy(status = "pending", revision = res.data) else it
                }
            }
        }
        Unit
    }

    suspend fun updateOrderStatus(orderId: String, newStatus: String): Result<Unit> = runCatching {
        val remote = syncRepo ?: throw IllegalStateException("Server connectivity required")
        when (val res = remote.fulfilSellerOrder(orderId, newStatus)) {
            is CloudflareResult.Failure -> throw IllegalStateException(res.message)
            is CloudflareResult.Success -> Unit
        }
        _sellerOrders.value = _sellerOrders.value.map {
            if (it.id == orderId) it.copy(fulfilmentStatus = newStatus, updatedAtEpochMs = System.currentTimeMillis()) else it
        }
        Unit
    }
}
