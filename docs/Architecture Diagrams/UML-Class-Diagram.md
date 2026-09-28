# MarketSphere — UML Class Diagram

## 1. Overview

The UML Class Diagram represents the core object-oriented structure of MarketSphere.

The system supports three primary user roles:

* Buyer
* Seller
* Administrator

The initial marketplace focuses on home textiles and home furnishings, connecting sellers in Sonipat with buyers across Delhi-NCR.

The diagram models the core marketplace domain. Authentication infrastructure, database implementation details, and UI components are intentionally kept separate from the domain classes.

## 2. Class Diagram

```mermaid
classDiagram
direction TB

class User {
    +String id
    +String name
    +String email
    +String phone
    +String passwordHash
    +UserRole role
    +AccountStatus status
    +DateTime createdAt
    +DateTime updatedAt
    +register()
    +login()
    +updateProfile()
    +deactivateAccount()
}

class BusinessProfile {
    +String id
    +String userId
    +String businessName
    +BusinessType businessType
    +String description
    +String address
    +String city
    +String state
    +String pincode
    +VerificationStatus verificationStatus
    +DateTime createdAt
    +updateDetails()
    +submitVerification()
}

class Seller {
    +createProduct()
    +updateProduct()
    +deactivateProduct()
    +viewRequests()
    +respondToRequest()
    +confirmOrder()
}

class Buyer {
    +searchProducts()
    +viewSeller()
    +submitOrderRequest()
    +respondToProposal()
    +viewOrderHistory()
}

class Admin {
    +reviewSeller()
    +approveSeller()
    +rejectSeller()
    +moderateProduct()
    +manageUser()
    +resolveReport()
}

class Product {
    +String id
    +String sellerId
    +String name
    +String description
    +String category
    +Decimal indicativePrice
    +Int minimumOrderQuantity
    +ProductStatus status
    +DateTime createdAt
    +DateTime updatedAt
    +create()
    +update()
    +deactivate()
    +updateAvailability()
}

class ProductVariant {
    +String id
    +String productId
    +String name
    +String value
    +String sku
    +Boolean isAvailable
}

class ProductImage {
    +String id
    +String productId
    +String imageUrl
    +Int displayOrder
    +addImage()
    +removeImage()
}

class OrderRequest {
    +String id
    +String buyerId
    +String sellerId
    +RequestStatus status
    +String deliveryAddress
    +String buyerNotes
    +Decimal proposedTotal
    +Decimal agreedTotal
    +DateTime createdAt
    +DateTime updatedAt
    +submit()
    +accept()
    +reject()
    +proposeChanges()
    +cancel()
    +complete()
}

class OrderItem {
    +String id
    +String orderRequestId
    +String productId
    +String productNameSnapshot
    +String variantSnapshot
    +Int quantity
    +Decimal requestedUnitPrice
    +Decimal agreedUnitPrice
    +calculateSubtotal()
}

class OrderStatusHistory {
    +String id
    +String orderRequestId
    +RequestStatus previousStatus
    +RequestStatus newStatus
    +String changedBy
    +String note
    +DateTime createdAt
    +recordChange()
}

class Notification {
    +String id
    +String userId
    +String title
    +String message
    +NotificationType type
    +Boolean isRead
    +DateTime createdAt
    +markAsRead()
}

class Report {
    +String id
    +String reporterId
    +String reportedUserId
    +String productId
    +String reason
    +ReportStatus status
    +String resolution
    +DateTime createdAt
    +resolve()
}

class UserRole {
    <<enumeration>>
    BUYER
    SELLER
    ADMIN
}

class AccountStatus {
    <<enumeration>>
    PENDING
    ACTIVE
    REJECTED
    SUSPENDED
}

class BusinessType {
    <<enumeration>>
    MANUFACTURER
    WHOLESALER
    RETAILER
    DISTRIBUTOR
    RESELLER
    INSTITUTIONAL
}

class VerificationStatus {
    <<enumeration>>
    NOT_SUBMITTED
    PENDING
    APPROVED
    REJECTED
}

class ProductStatus {
    <<enumeration>>
    DRAFT
    PENDING_REVIEW
    ACTIVE
    REJECTED
    INACTIVE
}

class RequestStatus {
    <<enumeration>>
    PENDING_SELLER
    SELLER_PROPOSED
    AWAITING_BUYER
    ACCEPTED
    REJECTED
    CANCELLED
    COMPLETED
}

class NotificationType {
    <<enumeration>>
    ORDER_REQUEST
    ORDER_RESPONSE
    ORDER_UPDATE
    ACCOUNT_UPDATE
    SYSTEM
}

class ReportStatus {
    <<enumeration>>
    OPEN
    UNDER_REVIEW
    RESOLVED
    DISMISSED
}

User <|-- Buyer
User <|-- Seller
User <|-- Admin

User "1" *-- "0..1" BusinessProfile : owns
Seller "1" --> "0..*" Product : lists
Product "1" *-- "0..*" ProductVariant : has
Product "1" *-- "0..*" ProductImage : has

Buyer "1" --> "0..*" OrderRequest : submits
Seller "1" --> "0..*" OrderRequest : receives
OrderRequest "1" *-- "1..*" OrderItem : contains
OrderRequest "1" *-- "1..*" OrderStatusHistory : tracks
OrderItem "*" --> "1" Product : references

User "1" --> "0..*" Notification : receives
User "1" --> "0..*" Report : submits
Admin "1" --> "0..*" Report : reviews

User --> UserRole
User --> AccountStatus
BusinessProfile --> BusinessType
BusinessProfile --> VerificationStatus
Product --> ProductStatus
OrderRequest --> RequestStatus
Notification --> NotificationType
Report --> ReportStatus
```

## 3. Class Responsibilities

| Class              | Responsibility                                                           |
| ------------------ | ------------------------------------------------------------------------ |
| User               | Stores common account information and authentication-related identity    |
| Buyer              | Supports product discovery and order requests                            |
| Seller             | Manages products and responds to order requests                          |
| Admin              | Manages platform users, verification, moderation, and reports            |
| BusinessProfile    | Stores business information and verification status                      |
| Product            | Represents a seller's product listing                                    |
| ProductVariant     | Represents product options such as size, color, or material              |
| ProductImage       | Stores product image references                                          |
| OrderRequest       | Manages the buyer's request and its negotiation and acceptance lifecycle |
| OrderItem          | Stores requested products and agreed item-level terms                    |
| OrderStatusHistory | Records changes to request and order status                              |
| Notification       | Stores user-facing notifications                                         |
| Report             | Stores complaints or reports for administrative review                   |

## 4. Important Design Decisions

### User roles

Buyer, Seller, and Admin inherit common account attributes from User. Role-specific operations are separated into their respective classes.

In the database, these may be implemented as a single User table with a role field rather than separate tables for each subclass.

### Business profiles

A user may have one business profile. The initial implementation should enforce the intended relationship and ensure that seller-specific verification requirements are applied to seller accounts.

### Product variants

Products can have multiple variants. For example, a bedsheet may be available in different sizes or colors.

Variant attributes should be flexible enough to support different home textile products without requiring a separate class for every product type.

### Order requests

OrderRequest is the central transaction entity.

It begins as a request, not a confirmed order. The seller can accept, reject, or propose changes. If the seller proposes changes, the buyer must respond before the request becomes an accepted order.

### Order snapshots

OrderItem stores product information relevant to the request at the time it is submitted or accepted.

Historical orders must not silently change when a seller edits a product listing.

### Status history

OrderStatusHistory preserves the sequence of changes to an order request. It supports troubleshooting and helps both parties understand what happened.

### Authentication

The User class represents the application account. Actual authentication, password hashing, session handling, and authorization should be implemented in dedicated backend services and middleware.

## 5. Electron Compatibility

The domain classes are independent of the interface used to access MarketSphere.

The same business logic should be usable from:

* The web application
* The future Electron desktop application

Electron should not introduce a second copy of the order, product, or user domain logic.

The desktop application should communicate with the same backend services as the web application, using authenticated and authorized API requests.
