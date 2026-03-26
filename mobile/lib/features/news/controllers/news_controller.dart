import 'package:get/get.dart';
import '../../../core/services/api_service.dart';
import '../../../core/constants/api_constants.dart';
import '../models/news_model.dart';

class NewsController extends GetxController {
  final ApiService _apiService = ApiService();
  
  var isLoading = true.obs;
  var newsList = <NewsModel>[].obs;
  var errorMessage = ''.obs;

  @override
  void onInit() {
    super.onInit();
    fetchNews();
  }

  Future<void> fetchNews({int page = 0, int size = 20}) async {
    try {
      isLoading.value = true;
      errorMessage.value = '';
      
      final response = await _apiService.get(
        ApiConstants.publishedNews,
        queryParameters: {
          'page': page,
          'size': size,
        },
      );

      if (response.statusCode == 200) {
        final data = response.data;
        if (data != null && data['content'] != null) {
          final List<dynamic> content = data['content'];
          var fetchedList = content.map((json) => NewsModel.fromJson(json)).toList();
          
          // Đảm bảo client luôn sort list theo thời gian mới nhất
          fetchedList.sort((a, b) {
            DateTime dateA = DateTime.tryParse(a.publishedAt ?? a.createdAt) ?? DateTime(2000);
            DateTime dateB = DateTime.tryParse(b.publishedAt ?? b.createdAt) ?? DateTime(2000);
            return dateB.compareTo(dateA); // Giảm dần (Mới nhất lên đầu)
          });
          
          newsList.value = fetchedList;
        }
      } else {
        errorMessage.value = 'Không thể tải tin tức. Vui lòng thử lại sau.';
      }
    } catch (e) {
      errorMessage.value = 'Có lỗi xảy ra khi kết nối máy chủ.';
      print('[NewsController] Error fetching news: $e');
    } finally {
      isLoading.value = false;
    }
  }
  Future<NewsModel?> getNewsById(int id) async {
    try {
      final response = await _apiService.get('${ApiConstants.publishedNews}/$id');
      if (response.statusCode == 200 && response.data != null) {
        return NewsModel.fromJson(response.data);
      }
    } catch (e) {
      print('[NewsController] Error fetching news by id $id: $e');
    }
    return null;
  }
}
