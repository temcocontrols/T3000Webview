
import TextureScale from './TextureScale';

class PaintData {
  public FillType: number;
  public Color: string;
  public EndColor: string;
  public GradientFlags: number;
  public Texture: number;
  public TextureScale: any;
  public Opacity: number;
  public EndOpacity: number;

  constructor(color: string) {
    this.FillType = 1;
    this.Color = color;
    this.EndColor = '#FFFFFF';
    this.GradientFlags = 0;
    this.Texture = 0;
    this.TextureScale = new TextureScale();
    this.Opacity = 1;
    this.EndOpacity = 1;
  }
}

export default PaintData;
