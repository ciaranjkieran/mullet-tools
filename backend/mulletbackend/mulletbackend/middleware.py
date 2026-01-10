# middleware.py
class LogPathMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        print("DJANGO GOT:", request.method, request.get_full_path())
        return self.get_response(request)
