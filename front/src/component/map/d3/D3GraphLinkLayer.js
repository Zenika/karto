import D3GraphLayer from './D3GraphLayer';

export default class D3GraphLinkLayer extends D3GraphLayer {

    attach(svgElement) {
        super.attach(svgElement);
        this.linkSvgContainer = svgElement.append('g').attr('class', this.name);
    }
}
