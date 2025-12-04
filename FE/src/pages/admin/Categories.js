import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Space,
  Popconfirm,
  message,
  Typography,
  Tag,
  Empty,
  Spin,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ThunderboltOutlined, FolderOutlined } from '@ant-design/icons';
import { category } from '../../api/index.js';

const { Title } = Typography;
const { TextArea } = Input;

// Utility function to convert Vietnamese text to slug
const generateSlug = (text) => {
  if (!text) return '';
  
  // Vietnamese character mapping
  const vietnameseMap = {
    'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
    'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
    'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
    'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
    'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
    'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
    'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
    'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
    'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
    'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
    'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
    'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
    'đ': 'd',
    'À': 'A', 'Á': 'A', 'Ạ': 'A', 'Ả': 'A', 'Ã': 'A',
    'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ậ': 'A', 'Ẩ': 'A', 'Ẫ': 'A',
    'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ặ': 'A', 'Ẳ': 'A', 'Ẵ': 'A',
    'È': 'E', 'É': 'E', 'Ẹ': 'E', 'Ẻ': 'E', 'Ẽ': 'E',
    'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ệ': 'E', 'Ể': 'E', 'Ễ': 'E',
    'Ì': 'I', 'Í': 'I', 'Ị': 'I', 'Ỉ': 'I', 'Ĩ': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ọ': 'O', 'Ỏ': 'O', 'Õ': 'O',
    'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ộ': 'O', 'Ổ': 'O', 'Ỗ': 'O',
    'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ợ': 'O', 'Ở': 'O', 'Ỡ': 'O',
    'Ù': 'U', 'Ú': 'U', 'Ụ': 'U', 'Ủ': 'U', 'Ũ': 'U',
    'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ự': 'U', 'Ử': 'U', 'Ữ': 'U',
    'Ỳ': 'Y', 'Ý': 'Y', 'Ỵ': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y',
    'Đ': 'D',
  };
  
  return text
    .trim()
    .toLowerCase()
    .split('')
    .map(char => vietnameseMap[char] || char)
    .join('')
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
};

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form] = Form.useForm();
  const slugValue = Form.useWatch('slug', form);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await category.getCategoryTree();
      if (response.success) {
        setCategories(response.data || []);
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi tải danh mục');
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra khi tải danh mục';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      let response;
      if (editingCategory) {
        response = await category.updateCategory(editingCategory.category_id, values);
      } else {
        response = await category.createCategory(values);
      }
      if (response.success) {
        message.success(editingCategory ? 'Cập nhật danh mục thành công' : 'Tạo danh mục thành công');
        setShowForm(false);
        setEditingCategory(null);
        form.resetFields();
        loadCategories();
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi lưu danh mục');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra khi lưu danh mục';
      message.error(errorMessage);
    }
  };

  const handleEdit = (cat) => {
    setEditingCategory(cat);
    form.setFieldsValue({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      parent_id: cat.parent_id || undefined,
    });
    setShowForm(true);
  };

  const handleGenerateSlug = () => {
    const name = form.getFieldValue('name');
    if (!name || !name.trim()) {
      message.warning('Vui lòng nhập tên danh mục trước');
      return;
    }
    const slug = generateSlug(name);
    // Set slug value to form and force update
    form.setFieldsValue({ slug });
    // Force form to update and display the slug value
    setTimeout(() => {
      form.validateFields(['slug']).catch(() => {});
    }, 0);
    message.success(`Đã tạo slug tự động: ${slug}`);
  };

  const handleDelete = async (id) => {
    try {
      const response = await category.deleteCategory(id);
      if (response.success) {
        message.success('Xóa danh mục thành công');
        loadCategories();
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi xóa danh mục');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra khi xóa danh mục';
      message.error(errorMessage);
    }
  };

  const flattenCategories = (cats, level = 0) => {
    let result = [];
    cats.forEach((cat) => {
      result.push({ ...cat, level });
      if (cat.children && cat.children.length > 0) {
        result = result.concat(flattenCategories(cat.children, level + 1));
      }
    });
    return result;
  };


  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>Quản Lý Danh Mục</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingCategory(null);
            form.resetFields();
            // Clear slug field when adding new category
            form.setFieldsValue({ slug: '' });
            setShowForm(true);
          }}
        >
          Thêm Danh Mục
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      ) : categories.length === 0 ? (
        <Empty description="Chưa có danh mục nào" />
      ) : (
        <Row gutter={[16, 16]}>
          {flattenCategories(categories).map((cat) => (
            <Col key={cat.category_id} xs={24} sm={12} md={8} lg={6} xl={4}>
              <Card
                hoverable
                style={{ height: '100%' }}
                actions={[
                  <Button
                    key="edit"
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(cat)}
                    block
                  >
                    Sửa
                  </Button>,
                  <Popconfirm
                    key="delete"
                    title="Bạn có chắc muốn xóa danh mục này?"
                    onConfirm={() => handleDelete(cat.category_id)}
                    okText="Xóa"
                    cancelText="Hủy"
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      block
                    >
                      Xóa
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <div style={{ textAlign: 'center' }}>
                  <FolderOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '12px' }} />
                  <div style={{ marginBottom: '8px' }}>
                    <Tag color="blue" style={{ fontSize: '12px' }}>
                      ID: {cat.category_id}
                    </Tag>
                    {cat.level > 0 && (
                      <Tag color="default" style={{ fontSize: '12px' }}>
                        Cấp {cat.level + 1}
                      </Tag>
                    )}
                  </div>
                  <Typography.Title level={5} style={{ margin: '8px 0', minHeight: '48px' }}>
                    {cat.name}
                  </Typography.Title>
                  {cat.slug && (
                    <Typography.Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '8px' }}>
                      {cat.slug}
                    </Typography.Text>
                  )}
                  {cat.description && (
                    <Typography.Text
                      type="secondary"
                      ellipsis
                      style={{ fontSize: '12px', display: 'block', marginTop: '8px', minHeight: '36px' }}
                    >
                      {cat.description}
                    </Typography.Text>
                  )}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title={editingCategory ? 'Sửa Danh Mục' : 'Thêm Danh Mục'}
        open={showForm}
        onCancel={() => {
          setShowForm(false);
          setEditingCategory(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Tên Danh Mục"
            rules={[{ required: true, message: 'Vui lòng nhập tên danh mục' }]}
          >
            <Input 
              placeholder="Nhập tên danh mục" 
            />
          </Form.Item>
          <Form.Item 
            name="slug" 
            label="Slug"
            tooltip="Slug sẽ được tạo tự động từ tên danh mục. Bạn có thể chỉnh sửa nếu cần."
          >
            <Input.Group compact>
              <Input 
                style={{ width: 'calc(100% - 120px)' }}
                placeholder={editingCategory ? "Slug của danh mục" : "Slug sẽ được tạo tự động từ tên danh mục"}
              />
              <Button
                type="default"
                icon={<ThunderboltOutlined />}
                onClick={handleGenerateSlug}
                style={{ width: '120px' }}
              >
                Tạo tự động
              </Button>
            </Input.Group>
            {slugValue && (
              <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px', fontSize: '12px' }}>
                <strong>✓ Slug đã tạo:</strong> <span style={{ color: '#1890ff', fontFamily: 'monospace', fontWeight: 'bold' }}>{slugValue}</span>
              </div>
            )}
            {editingCategory && slugValue && (
              <div style={{ marginTop: '4px', fontSize: '12px', color: '#999' }}>
                Slug hiện tại: <strong>{slugValue}</strong>
              </div>
            )}
          </Form.Item>
          <Form.Item name="description" label="Mô Tả">
            <TextArea rows={4} placeholder="Nhập mô tả" />
          </Form.Item>
          <Form.Item name="parent_id" label="Danh Mục Cha">
            <Select placeholder="Chọn danh mục cha" allowClear>
              {flattenCategories(categories)
                .filter((cat) => !editingCategory || cat.category_id !== editingCategory.category_id)
                .map((cat) => (
                  <Select.Option key={cat.category_id} value={cat.category_id}>
                    {'─'.repeat(cat.level || 0)} {cat.name}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Lưu
              </Button>
              <Button
                onClick={() => {
                  setShowForm(false);
                  setEditingCategory(null);
                  form.resetFields();
                }}
              >
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminCategories;
