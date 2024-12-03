import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import firestore from '@react-native-firebase/firestore';
import { Searchbar, Button, IconButton } from 'react-native-paper';
import * as XLSX from 'xlsx';
import RNFS from 'react-native-fs';

const BLUE_COLOR = '#0000CD';

const StaticList = ({ chartData, onClose }) => {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStartDate, setSelectedStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)));
  const [selectedEndDate, setSelectedEndDate] = useState(new Date());

  useEffect(() => {
    const fetchItems = async () => {
      try {
        let query;
        switch (chartData.type) {
          case 'error':
            query = firestore().collection('ERROR').where('deviceName', '==', chartData.label);
            break;
          case 'userByRoom':
            query = firestore().collection('USERS').where('department', '==', chartData.label);
            break;
          case 'deviceByRoom':
            query = firestore().collection('DEVICES').where('departmentName', '==', chartData.label);
            break;
          case 'deviceByUser':
            query = firestore().collection('DEVICES').where('user', '==', chartData.label);
            break;
          default:
            console.error("Unknown chart type");
            return;
        }

        const snapshot = await query.get();
        console.log("Fetched devices:", snapshot.docs.map(doc => doc.data()));
        const itemsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setItems(itemsList);
        setFilteredItems(itemsList);
      } catch (error) {
        console.error("Error fetching items: ", error);
      }
    };

    fetchItems();
  }, [chartData]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    const lowercasedQuery = query.toLowerCase();
    const filtered = items.filter(item => 
      Object.values(item).some(value => 
        typeof value === 'string' && value.toLowerCase().includes(lowercasedQuery)
      )
    );
    setFilteredItems(filtered);
  };

  const getItemContent = (item) => {
    switch (chartData.type) {
      case 'error':
        return {
              title: `Người báo cáo: ${item.userreport || 'Không có tên'}\nKiểu thiết bị: ${item.deviceType || 'Không có kiểu'}`,
              subtitle: `Phòng: ${item.deviceRoom || ''}\nTrạng thái: ${item.state || ''}\nNgày báo cáo: ${item.reportday || ''}\nNgày sửa: ${item.fixday || ''}\nMô tả: ${item.description || ''}`,
              icon: item.state === "Đã sửa" ? "check-circle" : "exclamation-circle",
              iconColor: item.state === "Đã sửa" ? "green" : "red"
        };
      case 'userByRoom':
        return {
          title: item.fullname,
          subtitle: item.email || 'Không có email',
          icon: 'user'
        };
        case 'deviceByRoom':
          return {
            title: item.name || 'Không có tên thiết bị',
            subtitle: `${item.type || 'Không có kiểu thiết bị'}\n${item.user || 'Không có người dùng'}\n${item.userEmail || 'Không có email'}`,
            icon: 'desktop'
          };
        case 'deviceByUser':
          return {
            title: item.name || 'Không có tên thiết bị', 
            subtitle: `${item.type || 'Không có kiểu thiết bị'}\n${item.user || 'Không có người dùng'}\n${item.userEmail || 'Không có email'}`,
            icon: 'desktop'
          };
      case 'columnData':
        return {
          title: item.name || 'Không có tên',
          subtitle: `Giá trị: ${item.value}`,
          icon: 'bar-chart'
        };
      default:
        return {
          title: 'Unknown',
          subtitle: 'Unknown',
          icon: 'question-circle'
        };
    }
  };

  const renderItem = ({ item }) => {
    const { title, subtitle, icon } = getItemContent(item);
    const isTitleBlue = chartData.type === 'deviceByRoom' || chartData.type === 'deviceByUser';

    return (
      <TouchableOpacity style={styles.item}>
        <View style={styles.iconContainer}>
          <Icon name={icon} size={24} color={BLUE_COLOR} />
        </View>
        <View style={styles.itemTextContainer}>
          <Text style={[styles.title, { color: BLUE_COLOR }]}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: BLUE_COLOR }]}>
            {subtitle}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleExportToExcel = () => {
    const title = `Danh sách ${
      chartData.type === 'error' ? 'lỗi' : 
      chartData.type === 'userByRoom' ? 'người dùng' : 
      chartData.type === 'deviceByRoom' || chartData.type === 'deviceByUser' ? 'thiết bị' : 
      'dữ liệu'
    } của ${chartData.label}`;

    if (chartData.type === 'error') {
      Alert.alert(
        "Xuất Excel",
        `Chọn khoảng thời gian để xuất dữ liệu\n\nTừ ngày: ${formatDate(selectedStartDate)}\nĐến ngày: ${formatDate(selectedEndDate)}`,
        [
          {
            text: "Hủy",
            style: "cancel"
          },
          {
            text: "Xuất Excel",
            onPress: () => handleExportConfirmation(filteredItems, title, selectedStartDate, selectedEndDate)
          },
          {
            text: "Chọn khoảng thời gian",
            onPress: () => {
              Alert.alert(
                "Chọn khoảng thời gian",
                "Vui lòng chọn khoảng thời gian",
                [
                  {
                    text: "1 tuần gần đây",
                    onPress: () => {
                      const end = new Date();
                      const start = new Date();
                      start.setDate(end.getDate() - 7);
                      setSelectedStartDate(start);
                      setSelectedEndDate(end);
                      handleExportConfirmation(filteredItems, title, start, end);
                    }
                  },
                  {
                    text: "1 tháng gần đây",
                    onPress: () => {
                      const end = new Date();
                      const start = new Date();
                      start.setMonth(end.getMonth() - 1);
                      setSelectedStartDate(start);
                      setSelectedEndDate(end);
                      handleExportConfirmation(filteredItems, title, start, end);
                    }
                  },
                  {
                    text: "3 tháng gần đây",
                    onPress: () => {
                      const end = new Date();
                      const start = new Date();
                      start.setMonth(end.getMonth() - 3);
                      setSelectedStartDate(start);
                      setSelectedEndDate(end);
                      handleExportConfirmation(filteredItems, title, start, end);
                    }
                  },
                  {
                    text: "Hủy",
                    style: "cancel"
                  }
                ]
              );
            }
          }
        ]
      );
    } else {
      Alert.alert(
        "Xuất Excel",
        `Bạn muốn xuất excel ${title}?`,
        [
          {
            text: "Hủy",
            style: "cancel"
          },
          {
            text: "Xác nhận",
            onPress: () => exportToExcel(filteredItems, title)
          }
        ]
      );
    }
  };

  const exportToExcel = async (data, title, startDate, endDate) => {
    try {
      let excelData;
      
      switch (chartData.type) {
        case 'error':
          excelData = [
            ['STT', 'Tên thiết bị', 'Phòng', 'Tên người dùng', 'Người báo lỗi', 'Ngày báo cáo', 'Ngày sửa', 'Tình trạng', 'Mô tả'],
            ...data.map((item, index) => [
              index + 1,
              item.deviceName || 'Không có thông tin',
              item.deviceRoom || 'Không có thông tin',
              item.userName || 'Không có thông tin',
              item.userreport || 'Không có thông tin',
              item.reportday || 'Không có thông tin',
              item.fixday || 'Không có thông tin',
              item.state || 'Không có thông tin',
              item.description || 'Không có thông tin'
            ])
          ];
          break;

        case 'userByRoom':
          excelData = [
            ['STT', 'Họ và tên', 'Email', 'Vai trò', 'Phòng'],
            ...data.map((item, index) => [
              index + 1,
              item.fullname || 'Không có thông tin',
              item.email || 'Không có thông tin',
              item.role || 'Không có thông tin',
              chartData.label || 'Không có thông tin'
            ])
          ];
          break;

        case 'deviceByRoom':
        case 'deviceByUser':
          excelData = [
            ['STT', 'Tên thiết bị', 'Loại thiết bị', 'Người dùng', 'Email', 'Thông số kỹ thuật', 'Ghi chú'],
            ...data.map((item, index) => [
              index + 1,
              item.name || 'Không có thông tin',
              item.type || 'Không có thông tin',
              item.user || 'Không có thông tin',
              item.userEmail || 'Không có thông tin',
              item.specifications ? JSON.stringify(item.specifications) : 'Không có thông tin',
              item.note || 'Không có thông tin'
            ])
          ];
          break;
      }

      const ws = XLSX.utils.aoa_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

      // Định dạng cột
      const columnWidths = [
        { wch: 5 },  // STT
        { wch: 30 }, // Tên
        { wch: 20 }, // Loại/Email
        { wch: 30 }, // Người dùng/Vai trò
        { wch: 30 }, // Email/Phòng
        { wch: 50 }, // Thông số kỹ thuật
        { wch: 30 }  // Ghi chú
      ];
      ws['!cols'] = columnWidths;

      // Định dạng header
      const headerRange = XLSX.utils.decode_range(ws['!ref']);
      for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });
        ws[address].s = {
          font: { bold: true },
          alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
          fill: { fgColor: { rgb: "FFFFAA00" } }
        };
      }

      // Định dạng data cells
      for (let R = 1; R <= headerRange.e.r; ++R) {
        for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
          const address = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[address]) continue;
          ws[address].s = {
            alignment: { vertical: 'center', horizontal: 'left', wrapText: true }
          };
        }
      }

      const wbout = XLSX.write(wb, { type: 'binary', bookType: "xlsx" });
      const fileName = `${title.replace(/\s+/g, '_')}_${new Date().getTime()}.xlsx`;
      const filePath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
      await RNFS.writeFile(filePath, wbout, 'ascii');

      Alert.alert('Thành công', `File đã được lưu vào thư mục Downloads với tên ${fileName}`);
    } catch (error) {
      console.error('Error in Excel export:', error);
      Alert.alert('Lỗi', 'Vui lòng mở quyền truy cập bộ nhớ của ứng dụng');
    }
  };

  const handleExportConfirmation = (data, title, startDate, endDate) => {
    Alert.alert(
      "Xác nhận xuất Excel",
      `Bạn muốn xuất Excel cho khoảng thời gian:\nTừ ngày: ${formatDate(startDate)}\nĐến ngày: ${formatDate(endDate)}?`,
      [
        {
          text: "Hủy",
          style: "cancel"
        },
        {
          text: "Xác nhận",
          onPress: () => exportToExcel(data, title, startDate, endDate)
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>
        {`Danh sách ${
          chartData.type === 'error' ? 'lỗi' : 
          chartData.type === 'userByRoom' ? 'người dùng' : 'thiết bị'
        } của ${chartData.label}`}
      </Text>
      <View style={styles.headerContainer}>
        <Searchbar
          placeholder="Tìm kiếm..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={[styles.searchBar, { flex: 1 }]}
          inputStyle={styles.searchBarInput}
          iconColor={BLUE_COLOR}
          placeholderTextColor={BLUE_COLOR}
          theme={{ colors: { primary: BLUE_COLOR } }}
        />
        <IconButton
          icon="microsoft-excel"
          size={24}
          onPress={handleExportToExcel}
          style={styles.exportButton}
          color={BLUE_COLOR}
        />
      </View>
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={onClose} style={styles.button}>
          <Text style={styles.buttonText}>Đóng</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 20,
  },
  headerText: {
    fontSize: 25,
    fontWeight: 'bold',
    textAlign: 'center',
    color: BLUE_COLOR,
    marginBottom: 10,
  },
  searchBar: {
    flex: 1,
    marginRight: 10,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: BLUE_COLOR,
  },
  searchBarInput: {
    color: BLUE_COLOR,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  iconContainer: {
    backgroundColor: '#e0e0e0',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  blueTitle: {
    color: BLUE_COLOR,
  },
  subtitle: {
    fontSize: 14,
    color: 'gray',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: BLUE_COLOR,
    padding: 10,
    borderRadius: 5,
    width: '40%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listContainer: {
    paddingVertical: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: 'red',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  exportButton: {
    margin: 0,
  },
});

export default StaticList;