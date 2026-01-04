# comments/urls.py
from rest_framework.routers import DefaultRouter
from .views import CommentViewSet, CommentAttachmentViewSet

router = DefaultRouter()
router.register(r'comments', CommentViewSet, basename="comment")
router.register(r'comment-attachments', CommentAttachmentViewSet, basename="commentattachment")

urlpatterns = router.urls
